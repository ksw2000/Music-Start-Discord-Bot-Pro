import { Guild } from 'discord.js';
const { instructions, params } = require('./language.json');

export class Commands {
    static async register(guild: Guild | null, lang?: string) {
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
                        required: true
                    }
                ]
            }, {
                name: 'pause',
                description: instructions.pause[lang]
            }, {
                name: 'resume',
                description: instructions.resume[lang]
            }, {
                name: 'stop',
                description: instructions.stop[lang]
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
                name: 'verbose',
                description: instructions.verbose[lang],
                options: [
                    {
                        name: 'truth',
                        type: 'BOOLEAN',
                        description: 'true/false',
                        required: true
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
                description: instructions.aqours[lang]
            }, {
                name: 'muse',
                description: instructions.muse[lang]
            }, {
                name: 'liella',
                description: instructions.liella[lang]
            }, {
                name: 'nijigasaki',
                description: instructions.nijigasaki[lang]
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
}