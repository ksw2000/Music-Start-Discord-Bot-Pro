
import { Intents, Client, Message, MessageEmbed, Interaction, GuildMember, VoiceChannel } from 'discord.js';
import {
    AudioPlayerStatus,
    AudioResource,
    AudioPlayer,
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus,
    VoiceConnection,
    createAudioPlayer,
    demuxProbe,
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

    static attach(channel: VoiceChannel): VoiceConnection {
        return joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            selfDeaf: true,
            selfMute: false,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
    }
}

class Bucket {
    id: string;
    connection: VoiceConnection | null;
    // dispatcher: Discord.StreamDispatcher | null;
    // queue: Queue;
    // music: Music;
    player: AudioPlayer;
    //playing: boolean;
    //volume: number;
    //pauseAt: number;

    static instant: Map<string, Bucket> = new Map();
    // 利用 msg.guild.id
    constructor(id: string) {
        this.id = id;
        this.connection = null;
        this.player = createAudioPlayer({ debug: true });
        // this.dispatcher = null;
        // this.queue = new Queue();
        // this.music = new Music(msg, this);
        //this.playing = false;
        //this.volume = .64;
        //this.pauseAt = 0;

        Bucket.instant.set(this.id, this);
    }

    connect(interaction: Interaction): boolean{
        if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
            this.connection = Util.attach(<VoiceChannel>interaction?.member?.voice?.channel);
            this.connection.subscribe(this.player);
            return true;
        }
        return false;
    }

    static find(id: string): Bucket {
        // 為了避免第一次呼叫他的人消失
        // Music 內的 msg 必需一直更新
        return Bucket.instant.get(id || "") || new Bucket(id);
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
            },{
                name: 'list',
                description: '列出播放清單'
            },{
                name: 'jump',
                description: '直接跳到播放清單的某一首歌',
                options:[
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
            },{
                name: 'next',
                description: '播放下一首'
            },{
                name: 'pre',
                description: '播放前一首'
            },{
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
        }else{
            await interaction.reply(`attach 失敗，Musci Start 無法加入語音群`);
        }
    } else if (interaction.commandName === 'bye'){
        bucket.connection?.destroy();
    }else if (interaction.commandName === 'play') {
        const url = interaction.options.get('url')?.value as string;

        try {
            const stream = ytdl(url, { quality: 'highest', filter: 'audioonly', highWaterMark: 1024});
            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
            });
            bucket.player.play(resource);
            console.log(bucket.player.state);
            await entersState(bucket.player, AudioPlayerStatus.Playing, 5e3);
            await interaction.reply(`正在播放: 某某某`);
        } catch (e) {
            await interaction.reply(`播放: ${e}`);
            console.error(e);
        }
    }else if(interaction.commandName === 'pause'){
        bucket.player.pause();
    }else if(interaction.commandName === 'resume'){
        bucket.player.unpause();
    } else if (interaction.commandName === 'stop') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'list') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'jump') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'remove') {
        await interaction.reply(`TODO`);
    } else if (interaction.commandName === 'shuffle') {
        await interaction.reply(`TODO`);
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