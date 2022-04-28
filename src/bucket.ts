import {
    Interaction,
    CommandInteraction,
    GuildMember,
    VoiceChannel,
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
import ytdl from 'ytdl-core';
import { messages } from './language.json';
import { Commands } from './commands';

interface langMap {
    [key: string]: string;
}

/**
 * An instance of Bucket represents one guild in Discord.
 * Use Bucket.find(`id`) to fetch the instance. 
 * Bucket.find(`id`) creates new instance if `id` is new one, else returns the instance we created.
 */
export class Bucket {
    private id: string;
    private connection: VoiceConnection | null = null;
    private interaction: CommandInteraction | Interaction | null = null;
    private voiceChannel: VoiceChannel | null = null;
    private resource: AudioResource | null = null;
    public player: AudioPlayer = this.createPlayer();
    public verbose: boolean = true; // if set false, the player does not show the information when starting playing song.
    private _playerErrorLock: boolean = false;   // set true when player is error.
    private _playerVolume: number = .64;
    private _lang: string = "en";
    readonly queue: Queue = new Queue();

    static instant: Map<string, Bucket> = new Map();

    constructor(id: string) {
        this.id = id;
        Bucket.instant.set(this.id, this);
    }

    static find(id: string): Bucket {
        return Bucket.instant.get(id || "") || new Bucket(id);
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
                this.interaction?.channel?.send((messages.paused_because_no_one_in_channel as langMap)[this.lang]);
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
            console.log('播放器發生錯誤!');
            console.log(error.message);
            console.log(error.name);
            console.log(error.stack);
            this._playerErrorLock = true;
            this.interaction?.channel?.send(Util.createEmbedMessage((messages.error as langMap)[this.lang],
                `${(messages.player_error as langMap)[this.lang]} ${Util.randomCry()}`, true));
        });

        // this block handles
        // (1) player error
        // (2) play next song when player finished
        player.on<"stateChange">('stateChange', (oldState, newState) => {
            // onfinish()
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                if (this._playerErrorLock) {
                    // error occurred
                    // fake finish()
                    console.log('Reset player');
                    this.player = this.createPlayer();
                } else {
                    // real finish()
                    this.queue.next(1);
                    this.play(this.queue.current).then(() => {
                        if (this.verbose) {
                            this.interaction?.channel?.send(Util.createMusicInfoMessage(this.queue.current));
                        }
                    }).catch(e => {
                        this.interaction?.channel?.send(Util.createEmbedMessage((messages.error as langMap)[this.lang], `${e}`, true));
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
     * @param begin start at `begin` milliseconds
     */
    private async play(music: MusicInfo, begin?: number): Promise<void> {
        if (this.connection === null) {
            throw ((messages.robot_not_in_voice_channel as langMap)[this.lang]);
        }

        // if the user not joined voice channel yet
        const stream = ytdl(music.url, {
            quality: 'highestaudio',
            filter: 'audioonly',
            highWaterMark: 1 << 25, // 32 MB
            begin: begin ? begin : 0,
            // begin: This option is not very reliable for non-live videos
        });

        // ytdlInfo seems to be expired after a period of time
        // const stream = ytdl.downloadFromInfo(music.ytdlInfo, {...});

        // DEBUG
        // number - Chunk length in bytes or segment number.
        // number - Total bytes or segments downloaded.
        // number - Total bytes or segments.
        // stream.on('progress', (chunkSize, downloadedSize, totalSize) => {
        //     this._playerDownloadedChunk = downloadedSize;
        //     this._playerTotalChunk = totalSize;
        // });

        this.resource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        });
        this.resource?.volume?.setVolume(this.volume);

        try {
            this.player.play(this.resource);
            await entersState(this.player, AudioPlayerStatus.Playing, 5e3);
        } catch (e) {
            console.error("bucket.ts play() error", e, "reset player");
            this.player = this.createPlayer();
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