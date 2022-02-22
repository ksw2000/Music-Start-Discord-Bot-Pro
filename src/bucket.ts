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

export class Bucket {
    private id: string;
    private connection: VoiceConnection | null = null;
    private interaction: CommandInteraction | Interaction | null = null;
    private resource: AudioResource | null = null;
    public player: AudioPlayer = this.createPlayer();
    private _playerErrorLock: boolean = false;   // set true when player is error
    private _playerVolume: number = .64;
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

    connect(interaction: Interaction): boolean {
        this.interaction = interaction;
        if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
            const channel = <VoiceChannel>interaction?.member?.voice?.channel;
            this.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                selfDeaf: true,
                selfMute: false,
                adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
            });
            this.connection.subscribe(this.player);
            return true;
        }
        return false;
    }

    createPlayer(): AudioPlayer {
        const player = createAudioPlayer({
            debug: true,
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            }
        });

        // https://discordjs.guide/voice/audio-player.html#life-cycle
        player.on(AudioPlayerStatus.Playing, () => {
            console.log("playing");
        });

        player.on(AudioPlayerStatus.Buffering, () => {
            console.log("buffering");
        });

        player.on(AudioPlayerStatus.AutoPaused, () => {
            console.log("autoPaused");
        });

        player.on(AudioPlayerStatus.Paused, () => {
            console.log("paused");
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log("idle");
        });

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
            this.interaction?.channel?.send(Util.createEmbedMessage('錯誤', `播放器發生錯誤 ${Util.randomCry()}`, true));
        });

        // this block handles
        // (1) player error
        // (2) play next song when player finished
        player.on('stateChange', (oldState, newState) => {
            // onfinish()
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.

                if (this._playerErrorLock) {
                    console.log('onfinish (error)');
                    // fake finish() i.e., error occurred
                    console.log('重置播放器');
                    this.player = this.createPlayer();
                } else {
                    // real finish()
                    console.log('onfinish (success)');
                    this.queue.next(1);
                    this.play(this.queue.current, this.interaction).then(() => {
                        this.interaction?.channel?.send(Util.createMusicInfoMessage(this.queue.current));
                    }).catch(e => {
                        this.interaction?.channel?.send(Util.createEmbedMessage('錯誤', `${e}`, true));
                    });
                }
                
                this._playerErrorLock = false;
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // onstart()
                // If the Playing state has been entered, then a new track has started playback.
                console.log('onstart');
            }
        });

        return player;
    }

    destroyConnection() {
        this.connection?.destroy();
    }

    // play() plays music.
    // @param interaction: If the discord users call play() interaction, this param is non null.
    // @param begin: start at `begin` milliseconds
    async play(music: MusicInfo, interaction: Interaction | CommandInteraction | null, begin?: number): Promise<void> {
        // if the user not joined voice channel yet
        if (this.connection === null) {
            if (interaction) {
                this.connect(interaction);
            } else {
                throw ('機器人尚未進入語音頻道');
            }
        }

        const stream = ytdl.downloadFromInfo(music.ytdlInfo, {
            quality: 'highestaudio',
            filter: 'audioonly',
            highWaterMark: 1 << 25, // 32 MB
            // begin: This option is not very reliable for non-live videos
            begin: begin ? begin : 0,
        });

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

        this.player.play(this.resource);
        await entersState(this.player, AudioPlayerStatus.Playing, 5e3);
    }

    // play() + edit reply
    async playAndEditReplyDefault(music: MusicInfo, interaction: CommandInteraction | null, begin?: number) {
        this.play(music, interaction, begin).then(() => {
            interaction?.editReply(Util.createMusicInfoMessage(music));
        }).catch(e => {
            interaction?.channel?.send(Util.createEmbedMessage('錯誤', `${e}`, true));
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
}