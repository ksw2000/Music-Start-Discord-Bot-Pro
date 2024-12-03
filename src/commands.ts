import { Guild, ApplicationCommandOptionType } from 'discord.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { instructions, params } = require('./language.json');

export class Commands {
    static async register(guild: Guild | null, lang?: string) {
        if (guild == null) return;
        lang = lang ?? "en";
        await guild.commands.set([{
            name: 'attach',
            description: instructions.attach[lang]
        }, {
            name: 'detach',
            description: instructions.detach[lang]
        }, {
            name: 'append',
            description: instructions.append[lang],
            options: [
                {
                    name: 'youtube',
                    type: ApplicationCommandOptionType.String,
                    description: params.youtube[lang],
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
            name: 'repeat',
            description: instructions.repeat[lang]
        }, {
            name: 'list',
            description: instructions.list[lang]
        }, {
            name: 'search',
            description: instructions.distinct[lang],
            options: [
                {
                    name: 'regexp',
                    type: ApplicationCommandOptionType.String,
                    description: params.regexp[lang],
                    required: true
                }
            ]
        }, {
            name: 'distinct',
            description: instructions.distinct[lang]
        }, {
            name: 'current',
            description: instructions.current[lang]
        }, {
            name: 'jump',
            description: instructions.jump[lang],
            options: [
                {
                    name: 'index',
                    type: ApplicationCommandOptionType.Integer,
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
                    type: ApplicationCommandOptionType.Integer,
                    description: params.index[lang],
                    required: true
                },
                {
                    name: 'index2',
                    type: ApplicationCommandOptionType.Integer,
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
                    type: ApplicationCommandOptionType.Integer,
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
            description: instructions.next[lang],
            options: [
                {
                    name: 'offset',
                    type: ApplicationCommandOptionType.Number,
                    description: params.offset[lang],
                    required: false
                }
            ]
        }, {
            name: 'pre',
            description: instructions.pre[lang]
        }, {
            name: 'vol',
            description: instructions.vol[lang],
            options: [
                {
                    name: 'volume',
                    type: ApplicationCommandOptionType.Number,
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
                    type: ApplicationCommandOptionType.Boolean,
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
                    type: ApplicationCommandOptionType.String,
                    description: params.json[lang],
                    required: false
                }
            ]
        }, {
            name: 'aqours',
            description: instructions.aqours[lang]
        }, {
            name: 'llss',
            description: instructions.llss[lang]
        }, {
            name: 'genjitsu',
            description: instructions.genjitsu[lang]
        }, {
            name: 'azalea',
            description: instructions.azalea[lang]
        }, {
            name: 'muse',
            description: instructions.muse[lang]
        }, {
            name: 'liella',
            description: instructions.liella[lang]
        }, {
            name: '5yncri5e',
            description: instructions.syncri5e[lang]
        }, {
            name: 'nijigasaki',
            description: instructions.nijigasaki[lang]
        }, {
            name: 'q4',
            description: instructions.q4[lang]
        }, {
            name: 'hasunosora',
            description: instructions.hasunosora[lang]
        }, {
            name: 'lang',
            description: instructions.lang[lang],
            options: [
                {
                    name: 'language',
                    type: ApplicationCommandOptionType.String,
                    description: params.language[lang]
                }
            ]
        }
        ]);
    }
}