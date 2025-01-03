import {
    Interaction,
    CommandInteraction,
    GuildMember,
    VoiceChannel,
    GuildTextBasedChannel,
} from 'discord.js';

import {
    AudioPlayerStatus,
    AudioPlayer,
    AudioResource,
    entersState,
    joinVoiceChannel,
    VoiceConnection,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior,
    StreamType,
    DiscordGatewayAdapterCreator
} from '@discordjs/voice';

import { MusicInfo } from './musicInfo';
import { Util } from './util';
import { Queue } from './queue';
import ytdl from '@distube/ytdl-core';
import { messages } from './language.json';
import { Commands } from './commands';
import *  as fs from 'fs';

interface langMap {
    [key: string]: string;
}

/**
 * An instance of Bucket represents one guild in Discord.
 * Use Bucket.find(`id`) to fetch the instance. 
 * Bucket.find(`id`) creates new instance if `id` is new one, else returns the instance we created.
 */
export class Bucket {
    public id: string;
    private connection: VoiceConnection | null = null;
    private interaction: CommandInteraction | Interaction | null = null;
    private voiceChannel: VoiceChannel | null = null;
    private resource: AudioResource | null = null;
    public player: AudioPlayer = this.createPlayer();
    public verbose: boolean = true; // if set false, the player does not show the information when starting playing song.
    private _playerErrorLock: boolean = false;   // set true when player is error.
    private _playerVolume: number = .64;
    private _lang: string = "en";
    private _repeat: boolean = false;
    readonly queue: Queue = new Queue();
    private static _useLog: boolean = true;
    private static _logFn: string = '';
    static disableLog() {
        Bucket._useLog = false;
    }

    static load(fn: string) {
        // Even if the file does not exist, set _logFn nonetheless.
        Bucket._logFn = fn;
        // if the file does not exist, exit
        if (!fs.existsSync(fn)) return;
        const data = JSON.parse(fs.readFileSync(fn, { encoding: 'utf-8', flag: 'r' }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.keys(data).forEach((k: any) => {
            const e = data[k];
            const bucket = new Bucket(k);
            bucket.lang = e.lang;
            bucket.volume = e.volume;
            e.queue.forEach((f: MusicInfo) => {
                bucket.queue.add(new MusicInfo(f.url, f.title, f.likes, f.viewCount, f.playCounter));
            });
            Bucket.instant.set(k, bucket);
        });
    }

    // store all instance of Bucket when _useLog is true
    store() {
        if (!Bucket._useLog) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ret: any = {};
        Bucket.instant.forEach((e: Bucket) => {
            ret[e.id] = {
                lang: this.lang,
                volume: this.volume,
                queue: this.queue.toList()
            };
        });

        fs.writeFileSync(Bucket._logFn, JSON.stringify(ret), { flag: 'w' });
    }

    static instant: Map<string, Bucket> = new Map();

    constructor(id: string) {
        if (id == undefined) throw ('no guild id when fetch Bucket');
        console.log('bucket id:', id);
        this.id = id;
        Bucket.instant.set(this.id, this);
    }

    static find(id: string): Bucket {
        // https://tutorial.eyehunts.com/js/javascript-double-question-mark-vs-double-pipe-code/
        return Bucket.instant.get(id) ?? new Bucket(id);
    }

    get playing(): boolean {
        return this.player.state.status === 'playing';
    }

    /**
     * Join the bot to the voice channel.
     * This method also updates the value of `this.interaction`.
     * @param interaction
     * @returns true if connect success
     */
    connect(interaction: Interaction): boolean {
        this.interaction = interaction;
        if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
            const voiceChannel = <VoiceChannel>interaction.member.voice.channel;
            this.voiceChannel = voiceChannel;
            this.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                selfDeaf: true,
                selfMute: false,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
            });
            this.connection.subscribe(this.player);
            return true;
        }
        return false;
    }

    disconnect() {
        this.connection?.destroy();
    }

    /**
     * Create a player that automatically plays the next song when finish playing.
     * When play the next song, show the information of it if `this.verbose` is true.
     * 
     * @returns an audio player object
     */
    createPlayer(): AudioPlayer {
        const player = createAudioPlayer({
            debug: true,
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            }
        });

        player.on(AudioPlayerStatus.Playing, () => {
            // if there is no one in voice channel when the player is playing, pause.
            if (this.voiceChannel != null && this.voiceChannel?.members.size <= 1) {
                player.pause();
                const channel = this.interaction?.channel as GuildTextBasedChannel | null | undefined;
                channel?.send((messages.paused_because_no_one_in_channel as langMap)[this.lang]);
            }
        });

        // https://discordjs.guide/voice/audio-player.html#life-cycle
        // DEBUG:
        // player.on(AudioPlayerStatus.Buffering, () => {
        //     console.log("buffering");
        // });

        // When the bot is not in any voice channels, the player is automatically paused.
        // player.on(AudioPlayerStatus.AutoPaused, () => {
        //     console.log("autoPaused");
        // });

        // player.on(AudioPlayerStatus.Paused, () => {
        //     console.log("paused");
        // });

        // player.on(AudioPlayerStatus.Idle, () => {
        //     console.log("idle");
        // });

        /**
         * 當播放器錯誤發生時，state會依序進入以下狀態:
         * 1. onError
         * 2. buffering
         * 3. onFinish
         * Thus, we can set _playerErrorLock to be `true` and fix error in the state of `onFinish`
         * Then, set _playerErrorLock to be `false`
         */

        player.on('error', (error) => {
            console.error('unexpected error in player');
            console.error(error.message);
            console.error(error.name);
            console.error(error.stack);
            this._playerErrorLock = true;
            const channel = this.interaction?.channel as GuildTextBasedChannel | null | undefined;
            channel?.send(Util.createEmbedMessage((messages.error as langMap)[this.lang],
                `${(messages.player_error as langMap)[this.lang]} ${Util.randomCry()}`, true));
        });

        // this block handles
        // (1) player error
        // (2) play next song when player finished
        player.on('stateChange', (oldState, newState) => {
            // onfinish()
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                if (!this._playerErrorLock) {
                    // real finish()
                    // update play counter
                    // if call removeAll(), the current will out of bound.
                    if (!this.queue.current) return;

                    this.queue.current.playCounter++;
                    this.store();

                    if (!this._repeat) {
                        this.queue.next(1);
                    }

                    this.play(this.queue.current).then(() => {
                        if (this.verbose) {
                            const channel = this.interaction?.channel as GuildTextBasedChannel | null | undefined;
                            channel?.send(Util.createMusicInfoMessage(this.queue.current));
                        }
                    });
                }
                this._playerErrorLock = false;
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // onstart()
            }
        });

        return player;
    }

    /**
     * Plays music on `this.player` by given MusicInfo.
     * @param music
     */
    private async play(music: MusicInfo): Promise<void> {
        if (this.connection === null) {
            throw ((messages.robot_not_in_voice_channel as langMap)[this.lang]);
        }

        const info = await ytdl.getInfo(music.url);
        const updatedMusicInfo = MusicInfo.fromDetails(info);
        if (updatedMusicInfo) {
            music.likes = updatedMusicInfo.likes;
            music.viewCount = updatedMusicInfo.viewCount;
        }

        // if the user not joined voice channel yet
        const stream = ytdl.downloadFromInfo(info, {
            quality: 'highestaudio',
            filter: 'audioonly',
            highWaterMark: 1 << 25, // 32 MB
            liveBuffer: 1 << 22, // 4 MB
        });

        // live music is not supported
        // check by info.videoDetails.isLiveContent
        if (info.videoDetails.isLiveContent) {
            const channel = this.interaction?.channel as GuildTextBasedChannel | null | undefined;
            channel?.send(Util.createEmbedMessage((messages.error as langMap)[this.lang], "Live video is not supported!", true));
            return;
        }

        // 256 kbps * 4s -> 2 ^ 17
        this.resource = createAudioResource(Util.bufferStream(stream, 1 << 17), {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        });
        this.resource?.volume?.setVolume(this.volume);

        try {
            this.player.play(this.resource);
            await entersState(this.player, AudioPlayerStatus.Playing, 3e4);
        } catch (e) {
            const channel = this.interaction?.channel as GuildTextBasedChannel | null | undefined;
            channel?.send(Util.createEmbedMessage((messages.error as langMap)[this.lang], `${e}`, true));
            console.error("bucket.ts play() error", e);
            channel?.send(Util.createEmbedMessage((messages.error as langMap)[this.lang],
                `${(messages.player_error as langMap)[this.lang]} ${Util.randomCry()}`, true));
        }
    }

    // play() + edit reply
    async playAndEditReplyDefault(music: MusicInfo, interaction: CommandInteraction | null) {
        this.play(music).then(() => {
            interaction?.editReply(Util.createMusicInfoMessage(music));
        }).catch(e => {
            interaction?.editReply(Util.createEmbedMessage((messages.error as langMap)[this.lang], `${e}`, true));
        });
    }

    // @return final `repeat` state
    toggleRepeat() {
        this._repeat = !this._repeat;
        return this._repeat;
    }

    get volume(): number {
        return this._playerVolume;
    }

    // @param: volume is in [0, 1]
    set volume(vol: number) {
        this._playerVolume = vol;
        this.resource?.volume?.setVolume(vol);
    }

    get lang(): string {
        return this._lang;
    }

    // set language and re-register command.
    set lang(lang: string) {
        this._lang = lang;
        if (this.interaction != null) {
            Commands.register(this.interaction.guild, this._lang);
        }
    }
}