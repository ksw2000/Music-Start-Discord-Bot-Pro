import {
    Options,
    EmbedBuilder
} from 'discord.js';

import { Queue } from './queue';
import { CachedMusicInfo, MusicInfo } from './musicInfo';
import { EventEmitter } from 'node:events';
import ytdl from '@distube/ytdl-core';
import internal, { PassThrough } from 'node:stream';

export class Util {
    static randomHappy() {
        const emojis = ['(*´∀`)~♥', 'σ`∀´)σ', '(〃∀〃)', '(✪ω✪)', '(๑´ㅂ`๑)', '(◕ܫ◕)', '( • ̀ω•́ )', '(*ﾟ∀ﾟ*)', '(灬ºωº灬)'];
        return emojis[~~(Math.random() * emojis.length)];
    }

    static randomCry() {
        const emojis = ['( ´•̥×•̥\`)', 'இдஇ', 'ヾ(;ﾟ;Д;ﾟ;)ﾉﾞ', '(☍﹏⁰)', '( ´•̥̥̥ω•̥̥̥` )', '(;´༎ຶД༎ຶ`)', '(☍﹏⁰。)', '(´;ω;`)'];
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

    // @param `title` should not be empty string ""
    static createEmbedMessage(title: string, description: string, isErrorMessage?: boolean): Options {
        return {
            embeds: [new EmbedBuilder()
                .setTitle(title)
                .setColor((isErrorMessage === true) ? 0xf54242 : 0x33DFFF)
                .setDescription(description)]
        };
    }

    static createMusicInfoMessage(info: MusicInfo): Options {
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
        description += `　:ear:　${Util.humanReadNum(info.playCounter)}`;
        return Util.createEmbedMessage(info?.title, description);
    }

    static sequentialEnqueueWithBatchListener(): EventEmitter {
        return new EventEmitter();
    }

    static enQueueCached(list: CachedMusicInfo[], queue: Queue) {
        if (!Array.isArray(list) || list.length == 0) {
            return;
        }
        list.forEach((v) => {
            queue.add(MusicInfo.fromCache(v));
        });
    }

    static sequentialEnQueueWithBatch(list: string[], queue: Queue, listener?: EventEmitter, batch?: number) {
        if (!Array.isArray(list) || list.length == 0) {
            listener?.emit('error', 'The input array should not be empty.');
            return;
        }
        const b = batch ?? 20;
        let done = 0;
        let success = 0;
        const total = list.length;
        const numBatches = Math.ceil(list.length / b);
        const batchList = Array.from(Array(numBatches).keys());
        listener?.emit('progress', 0, total);
        batchList.reduce(async (p, j) => {
            await p.then(async () => {
                const task: Promise<ytdl.videoInfo>[] = [];
                for (let i = j * b; i < Math.min(b * (j + 1), total); i++) {
                    done++;
                    task.push(ytdl.getInfo(list[i]));
                }
                await Promise.allSettled(task).then(data => {
                    data.filter(res => res.status === 'fulfilled').map(res => {
                        const info = MusicInfo.fromDetails(res.value);
                        if (info) {
                            success++;
                            queue.add(info);
                        }
                    });
                    listener?.emit('progress', done, total);
                }).catch(e => listener?.emit('error', e));
            });
        }, Promise.resolve()).then(() => {
            listener?.emit('done', total, total - success);
        });
    }

    static progressBar(current: number, all: number, bar: number): string {
        let content = '[';
        const percent = all == 0 ? 0 : Math.min(1, current / all);
        for (let i = 0; i < Math.ceil(percent * bar); i++) {
            content += '=';
        }
        for (let i = 0; i < bar - Math.ceil(percent * bar); i++) {
            content += '.';
        }
        content += (all == 0) ? ']' : `] ${current} / ${all}`;
        return content;
    }

    static bufferStream(sourceStream: internal.Readable, requiredBufferSize: number): internal.Readable {
        const bufferedStream = new PassThrough();
        const bufferChunks: Buffer[] = [];
        let bufferLength = 0;

        sourceStream.on('data', (chunk) => {
            bufferChunks.push(chunk);
            bufferLength += chunk.length;

            if (bufferLength >= requiredBufferSize) {
                while (bufferChunks.length > 0) {
                    const chunk = bufferChunks.shift();
                    if (chunk) {
                        bufferedStream.write(chunk, () => {
                            bufferLength -= chunk.length;
                        });
                    }
                }
            }
        });

        sourceStream.on('end', () => {
            while (bufferChunks.length > 0) {
                const chunk = bufferChunks.shift();
                if (chunk) {
                    bufferedStream.write(chunk);
                }
            }
            bufferedStream.end();
        });

        return bufferedStream
    }
}

