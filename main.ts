
import { Intents, Client, Interaction, CommandInteraction, GuildMember, VoiceChannel } from 'discord.js';
import {
    AudioPlayerStatus,
    AudioPlayer,
    entersState,
    joinVoiceChannel,
    VoiceConnection,
    createAudioPlayer,
    createAudioResource,
    StreamType
} from '@discordjs/voice';
const token = require('process').env.DiscordToken || require('./token.json').token;
import ytdl from 'ytdl-core';

class Util {
    static randomHappy() {
        const emojis = ['(*´∀`)~♥', 'σ`∀´)σ', '(〃∀〃)', '(శωశ)', '(✪ω✪)', '(๑´ㅂ`๑)', '(◕ܫ◕)', '( • ̀ω•́ )'];
        return emojis[~~(Math.random() * emojis.length)];
    }
}

class MusicInfo {
    url: string;
    title: string;
    likes: number;
    viewCount: number;

    constructor(url: string, title: string, likes: number, viewCount: number) {
        this.url = url;
        this.title = title;
        this.likes = likes;
        this.viewCount = viewCount;
    }

    static fromDetails(detail: any) {
        if (!detail.videoId) return null;
        let url = `https://www.youtube.com/watch?v=${detail.videoId}`;
        let title = detail.title || "";
        let viewCount = detail.viewCount || -1;
        let likes = detail.likes || -1;
        return new MusicInfo(url, title, likes, viewCount);
    }
}

class Queue {
    private _list: Array<MusicInfo>;
    private _index: number;

    constructor() {
        this._list = [];
        this._index = 0;
    }

    get len(): number {
        return this._list.length;
    }

    get current(): MusicInfo {
        return this._list[this._index];
    }

    _genericIndex(index: number) {
        index = index % this.len;
        return (index < 0) ? index + this.len : index;
    }

    isEmpty(): boolean {
        return this.len === 0;
    }

    en(info: MusicInfo) {
        this._list.push(info);
    }

    next(num: number) {
        return this.jump(this._index + num);
    }

    // @param index can be any integer.
    jump(index: number) {
        if (this.isEmpty()) throw ('播放清單是空的');
        this._index = this._genericIndex(index);
        return this._list[this._index];
    }

    // @param index can be any integer.
    remove(index: number) {
        index = this._genericIndex(index);
        if (index <= this._index) {
            this._index--;
        }
        this._list.splice(index, 1);
    }

    // showList() returns the list all elements in this queue
    showList(): string {
        if (this.isEmpty()) {
            return '無播放清單';
        }
        let content = '';
        for (const [index, info] of this._list.entries()) {
            if (index == this._index) {
                content += `**${index}.\t${info.title}**\n`;
            } else {
                content += `${index}.\t${info.title}\n`;
            }
        }
        return content;
    }


    shuffle() {
        for (let i = 0; i < this.len; i++) {
            let j = ~~(Math.random() * i);
            if (i != j && i != this._index && j != this._index) {
                // swap i and j
                let tmp = this._list[i]
                this._list[i] = this._list[j]
                this._list[j] = tmp
            }
        }
    }

    /*
        reset() {
            this.list = [];
            this.index = 0;
        }
    
        sort() {
            this.list.sort((a, b) => {
                return a.title.localeCompare(b.title)
            });
        }
    */
}

class Bucket {
    id: string;
    connection: VoiceConnection | null;
    queue: Queue;
    player: AudioPlayer;
    playing: boolean;
    //volume: number;
    //pauseAt: number;

    static instant: Map<string, Bucket> = new Map();

    constructor(id: string) {
        this.id = id;
        this.connection = null;
        this.player = createAudioPlayer({ debug: true });
        this.queue = new Queue();
        this.playing = false;
        //this.volume = .64;
        //this.pauseAt = 0;

        Bucket.instant.set(this.id, this);
    }

    connect(interaction: Interaction): boolean {
        if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
            const channel = <VoiceChannel>interaction?.member?.voice?.channel;
            this.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                selfDeaf: true,
                selfMute: false,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            this.connection.subscribe(this.player);
            return true;
        }
        return false;
    }

    static find(id: string): Bucket {
        return Bucket.instant.get(id || "") || new Bucket(id);
    }

    async play(interaction: CommandInteraction, music: MusicInfo, verbose: boolean = true): Promise<string> {
        try {
            // if the user not joinned voice channel yet
            if (this.connection === null) {
                this.connect(interaction);
            }

            const stream = ytdl(music.url, { quality: 'highest', filter: 'audioonly', highWaterMark: 1024 });
            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
            });
            this.player.play(resource);

            console.log(this.player.state);

            await entersState(this.player, AudioPlayerStatus.Playing, 5e3);;

            this.player.on('error', () => {
                console.log('播放器發生錯誤!');
                if (this.player.pause()) {
                    this.player.unpause();
                }
            });

            this.player.on('stateChange', (oldState, newState) => {
                console.log('oldstate:', oldState);
                console.log('newstate:', newState);
            });

            this.player.once('unsubscribe', () => {
                console.log('unsubscribe!');
            });
            return music.title;
        } catch (e) {
            console.log(e);
        }
        return "";
    }
}


const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

client.login(token);

client.on('error', (e) => {
    console.log(e);
})

client.on('messageCreate', async (msg) => {
    // 如果發送訊息的地方不是語音群（可能是私人），就 return
    if (!msg.guild) return;
    if (!client.application?.owner) await client.application?.fetch();
    const descriptionIndex = 'index 為播放清單的編號，由 0 開始，若 index 為負數則由清單最末尾開始計數，也就是說 -1 表示清單最後一首，若數字超過播放清單長度，則系統會啟用溢位';
    if (msg.content.toLowerCase() === 'music start') {
        await msg.guild.commands.set([
            {
                name: 'attach',
                description: '將 Music Start 加入您目前所在的語音房中'
            },
            {
                name: 'bye',
                description: '將 Music Start 踢出語音房'
            },
            {
                name: 'play',
                description: '播放音樂，若音樂正在播放，則會加入播放清單。若 Music Start 不在語音房中，則會自動呼叫 attach',
                options: [
                    {
                        name: 'url',
                        type: 'STRING',
                        description: '參數為 Youtube 連結',
                        required: true,
                    }
                ]
            }, {
                name: 'pause',
                description: '音樂暫停播放',
            }, {
                name: 'resume',
                description: '音樂繼續暫停',
            }, {
                name: 'stop',
                description: '停止播放，但不會將 Music Start 踢出語音房',
            }, {
                name: 'list',
                description: '列出播放清單'
            }, {
                name: 'jump',
                description: '直接跳到播放清單的某一首歌',
                options: [
                    {
                        name: 'index',
                        type: 'INTEGER',
                        description: descriptionIndex,
                        required: true
                    }
                ]
            }, {
                name: 'remove',
                description: '直接刪除播放清單的某一首歌',
                options: [
                    {
                        name: 'index',
                        type: 'INTEGER',
                        description: descriptionIndex,
                        required: true
                    }
                ]
            }, {
                name: 'shuffle',
                description: '將播放清單隨機打亂，正在播放的歌位置不會受影響'
            }, {
                name: 'next',
                description: '播放下一首'
            }, {
                name: 'pre',
                description: '播放前一首'
            }, {
                name: 'vol',
                description: '設定音量，若不指定 num 則會顯示目前的音量，預設為 0.64',
                options: [
                    {
                        name: 'num',
                        type: 'NUMBER',
                        description: '音量介於閉區間 [0, 1]',
                        required: true
                    }
                ]
            }, {
                name: 'seek',
                description: '跳到歌曲的某個時間點',
                options: [
                    {
                        name: 'time',
                        type: 'STRING',
                        description: '以 : 為60進位分割符',
                        required: true
                    }
                ]
            }
        ]);
    }
});

client.on('interactionCreate', async (interaction: Interaction) => {
    // 不是所有 interaction 都是 slash command
    if (!interaction.isCommand() || !interaction.guildId) return;
    let bucket = Bucket.find(interaction.guildId);

    if (interaction.commandName === 'attach') {
        if (bucket.connect(interaction)) {
            await interaction.reply(`☆歡迎使用 Music Start Pro! ${Util.randomHappy()} ☆`);
        } else {
            await interaction.reply(`attach 失敗，Musci Start 無法加入語音群`);
        }
    } else if (interaction.commandName === 'bye') {
        bucket.connection?.destroy();
        await interaction.reply(`ㄅㄅ`);
    } else if (interaction.commandName === 'play') {
        await interaction.deferReply();
        const url = interaction.options.get('url')?.value as string;
        const res = await ytdl.getInfo(url);
        const info = MusicInfo.fromDetails(res.videoDetails);
        interaction.editReply(`加入播放清單: ${info?.title}`);

        // 1. enQueue
        if (info == null) {
            // TODO
        } else {
            bucket.queue.en(info);
        }

        // 2. if not playing play current
        await bucket.play(interaction, bucket.queue.current);
    } else if (interaction.commandName === 'pause') {
        if (bucket.player.pause()) {
            await interaction.reply('音樂已暫停');
        } else {
            await interaction.reply('音樂暫停失敗，再試一次');
        }
    } else if (interaction.commandName === 'resume') {
        if (bucket.player.unpause()) {
            await interaction.reply('繼續播放');
        } else {
            await interaction.reply('繼續播放失敗，再試一次');
        }
    } else if (interaction.commandName === 'stop') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'list') {
        const list = bucket.queue.showList();
        await interaction.reply(list);
    } else if (interaction.commandName === 'jump') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'remove') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'shuffle') {
        bucket.queue.shuffle();
        await interaction.reply('已將播放清單打亂');
    } else if (interaction.commandName === 'next') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'pre') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'vol') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'seek') {
        await interaction.reply(`TODO`);
    }
})