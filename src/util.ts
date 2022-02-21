import {
    MessageOptions,
    MessageEmbed,
    Guild,
} from 'discord.js';

import {
    MusicInfo
} from './musicInfo';

export class Util {
    static randomHappy() {
        const emojis = ['(*´∀`)~♥', 'σ`∀´)σ', '(〃∀〃)', '(శωశ)', '(✪ω✪)', '(๑´ㅂ`๑)', '(◕ܫ◕)', '( • ̀ω•́ )', '(*ﾟ∀ﾟ*)', '(灬ºωº灬)'];
        return emojis[~~(Math.random() * emojis.length)];
    }

    static randomCry() {
        const emojis = ['( ´•̥×•̥\`)', 'இдஇ', 'ヾ(;ﾟ;Д;ﾟ;)ﾉﾞ', '(☍﹏⁰)', '( ´•̥̥̥ω•̥̥̥` )', '༼ ༎ຶ ෴ ༎ຶ༽'];
        return emojis[~~(Math.random() * emojis.length)];
    }

    // @param num: Integer
    static humanReadNum(num: number): string {
        try {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        } catch (e) {
            throw (e);
        }
    }

    static createEmbedMessage(title: string, description: string, isErrorMessage?: boolean): MessageOptions {
        return {
            embeds: [new MessageEmbed()
                .setTitle(title)
                .setColor((isErrorMessage === true) ? 0xf54242 : 0x33DFFF)
                .setDescription(description)]
        };
    }

    static createMusicInfoMessage(info: MusicInfo): MessageOptions {
        let description = `From youtube: ${info.url}\n\n`;
        if (info.viewCount != -1) {
            description += `:eyes:　${Util.humanReadNum(info.viewCount)}`;
        }
        if (info.likes != -1) {
            if (info.likes != -1) {
                description += '　';
            }
            description += `:heart:　${Util.humanReadNum(info.likes)}`;
        }
        return Util.createEmbedMessage(info?.title, description);
    }

    static async registerCommand(guild: Guild | null) {
        if (guild == null) return;
        const descriptionIndex = 'index 為播放清單的編號，由 0 開始，若 index 為負數則由清單最末尾開始計數，也就是說 -1 表示清單最後一首，若數字超過播放清單長度，則系統會自動取餘';
        await guild.commands.set([
            {
                name: 'attach',
                description: '將 Music Start Pro 加入您目前所在的語音房中，另外，當 Music Start Pro 更新指令時，可刷新指令集'
            },
            {
                name: 'bye',
                description: '將 Music Start Pro 踢出語音房'
            },
            {
                name: 'play',
                description: '播放音樂，若音樂正在播放，則會加入播放清單。若 Music Start Pro 不在語音房中，則會自動呼叫 /attach 加入您目前所在的語音房',
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
                description: '停止播放，並回到播放清單最前端',
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
                description: '指定刪除播放清單的某一首歌',
                options: [
                    {
                        name: 'index',
                        type: 'INTEGER',
                        description: descriptionIndex,
                        required: true
                    }
                ]
            }, {
                name: 'clear',
                description: '清空播放清單'
            }, {
                name: 'sort',
                description: '排序播放清單'
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
                        required: false
                    }
                ]
            }, {
                name: 'seek',
                description: '跳到歌曲的某個時間點，單位：秒',
                options: [
                    {
                        name: 'time',
                        type: 'STRING',
                        description: '以 : 為60進位分割符',
                        required: true
                    }
                ]
            }, {
                name: 'help',
                description: '顯示操作資訊',
            }, {
                name: 'json',
                description: '將 json 格式的播放清單一次加入到播放清單中',
                options: [
                    {
                        name: 'json',
                        type: 'STRING',
                        description: 'json 格式字串',
                        required: false
                    }
                ]
            }, {
                name: 'aqours',
                description: '將作者精選的 Aqours 的歌單加入播放清單中',
            }
        ]);
    }
}