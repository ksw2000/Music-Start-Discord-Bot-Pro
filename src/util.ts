import {
    MessageOptions,
    MessageEmbed,
} from 'discord.js';

import { Queue } from './queue';
import { MusicInfo } from './musicInfo';
import { EventEmitter } from 'events';
import ytdl from 'ytdl-core';

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

