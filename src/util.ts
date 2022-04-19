import {
    MessageOptions,
    MessageEmbed,
    Guild,
} from 'discord.js';

import { Queue } from './queue';
import { MusicInfo } from './musicInfo';
import { EventEmitter } from 'events';
import ytdl from 'ytdl-core';
const { instructions, params } = require('./language.json');

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

    static async registerCommand(guild: Guild | null, lang?: string) {
        if (guild == null) return;
        lang = lang ?? "en";
        await guild.commands.set([
            {
                name: 'attach',
                description: instructions.attach[lang]
            },
            {
                name: 'bye',
                description: instructions.bye[lang]
            },
            {
                name: 'play',
                description: instructions.play[lang],
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
                description: instructions.pause[lang],
            }, {
                name: 'resume',
                description: instructions.resume[lang],
            }, {
                name: 'stop',
                description: instructions.stop[lang],
            }, {
                name: 'list',
                description: instructions.list[lang]
            }, {
                name: 'distinct',
                description: instructions.distinct[lang]
            }, {
                name: 'jump',
                description: instructions.jump[lang],
                options: [
                    {
                        name: 'index',
                        type: 'INTEGER',
                        description: params.index[lang],
                        required: true
                    }
                ]
            }, {
                name: 'swap',
                description: instructions.swap[lang],
                options: [
                    {
                        name: 'index1',
                        type: 'INTEGER',
                        description: params.index[lang],
                        required: true
                    },
                    {
                        name: 'index2',
                        type: 'INTEGER',
                        description: params.index[lang],
                        required: true
                    }
                ]
            }, {
                name: 'remove',
                description: instructions.remove[lang],
                options: [
                    {
                        name: 'index',
                        type: 'INTEGER',
                        description: params.index[lang],
                        required: true
                    }
                ]
            }, {
                name: 'clear',
                description: instructions.clear[lang]
            }, {
                name: 'sort',
                description: instructions.sort[lang]
            }, {
                name: 'shuffle',
                description: instructions.shuffle[lang]
            }, {
                name: 'next',
                description: instructions.next[lang]
            }, {
                name: 'pre',
                description: instructions.next[lang]
            }, {
                name: 'vol',
                description: instructions.vol[lang],
                options: [
                    {
                        name: 'volume',
                        type: 'NUMBER',
                        description: params.volume[lang],
                        required: false
                    }
                ]
            }, {
                name: 'json',
                description: instructions.json[lang],
                options: [
                    {
                        name: 'json',
                        type: 'STRING',
                        description: params.json[lang],
                        required: false
                    }
                ]
            }, {
                name: 'aqours',
                description: instructions.aqours[lang],
            }, {
                name: 'muse',
                description: instructions.muse[lang],
            }, {
                name: 'lang',
                description: instructions.lang[lang],
                options: [
                    {
                        name: 'language',
                        type: 'STRING',
                        description: params.language[lang]
                    }
                ]
            }
        ]);
    }

    static sequentialEnqueueWithBatchListener(): EventEmitter {
        return new EventEmitter();
    }

    static sequentialEnQueueWithBatch(list: Array<string>, queue: Queue, listener?: EventEmitter, batch?: number) {
        let b = batch ?? 20;
        let done = 0;
        let fail = 0;
        let total = list.length;
        let numBatches = Math.ceil(list.length / b);
        let batchList = Array.from(Array(numBatches).keys());
        listener?.emit('progress', 0, total);
        batchList.reduce(async (p, j) => {
            await p.then(async () => {
                let task: Array<Promise<MusicInfo | null>> = [];
                for (let i = j * b; i < Math.min(b * (j + 1), total); i++) {
                    done++;
                    task.push(new Promise<MusicInfo | null>((resolve, reject) => {
                        ytdl.getInfo(list[i]).then(res => {
                            resolve(MusicInfo.fromDetails(res));
                        }).catch(reject);
                    }));
                }
                await Promise.all(task).then(infoList => {
                    infoList.forEach(info => {
                        if (info != null) {
                            queue.add(info);
                        } else {
                            fail++;
                        }
                    });
                    listener?.emit('progress', done, total);
                }).catch(e => listener?.emit('error', e));
            });
        }, Promise.resolve()).then(() => {
            listener?.emit('done', total, fail);
        });
    }

    static progressBar(current: number, all: number, bar: number): string {
        let content = '[';
        let percent = all == 0 ? 0 : Math.min(1, current / all);
        for (let i = 0; i < Math.ceil(percent * bar); i++) {
            content += '=';
        }
        for (let i = 0; i < bar - Math.ceil(percent * bar); i++) {
            content += '.';
        }
        content += (all == 0) ? ']' : `] ${current} / ${all}`;
        return content;
    }
}

