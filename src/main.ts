import {
    Client,
    GatewayIntentBits,
    Interaction,
    Guild,
    MessagePayload,
    MessageEditOptions,
    Options,
    Events
} from 'discord.js';

import ytdl from '@distube/ytdl-core';
import { MusicInfo } from './musicInfo';
import { Util } from './util';
import { Bucket } from './bucket';
import { Commands } from './commands';
import { messages } from './language.json';
import * as fs from 'node:fs';
import YAML from 'yaml';
import path from 'node:path';

interface langMap {
    [key: string]: string;
}

const logFile = 'data.json';

interface recommendList {
    url: string
    name: string
}[];

export function main(token: string, useLog: boolean) {
    // load buckets
    if (useLog) {
        console.log("The log file will be read/written at:", logFile);
        console.log("You can disable log file by -d or --disable-log");
        Bucket.load(logFile);
    } else {
        console.log("Log file: disable");
        Bucket.disableLog();
    }

    const progressBarLen = 35;
    const client: Client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates]
    });

    client.login(token);

    client.once(Events.ClientReady, (client: any) => {
        console.log(`Logged in as ${client.user?.tag}!`);
    });

    client.on(Events.GuildCreate, async (guild: Guild) => {
        console.log(`guild crated! ${guild.id}`);
        Commands.register(guild);
    });

    client.on(Events.Error, (e: any) => {
        console.log('client on error', e);
    });

    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        if (!interaction.guildId) return;
        let bucket = Bucket.find(interaction.guildId);
        if (interaction.isButton()) {
            let ids = interaction.customId.split('-');
            if (ids.length === 2 || ids.length === 3) {
                const currentPage = parseInt(ids[1]);
                switch (ids[0]) {
                    case 'next':
                        await interaction.update(bucket.queue.showList(bucket.lang, bucket.queue.genericPage(currentPage + 1), false) as MessageEditOptions);
                        break;
                    case 'pre':
                        await interaction.update(bucket.queue.showList(bucket.lang, bucket.queue.genericPage(currentPage - 1), false) as MessageEditOptions);
                        break;
                    case 'nextSearch':
                        await interaction.update(bucket.queue.showList(bucket.lang, bucket.queue.genericPage(currentPage + 1), true) as MessageEditOptions);
                        break;
                    case 'preSearch':
                        await interaction.update(bucket.queue.showList(bucket.lang, bucket.queue.genericPage(currentPage - 1), true) as MessageEditOptions);
                        break;
                }
            } else if (ids.length === 1) {
                if (ids[0] === 'refresh') {
                    await interaction.update(bucket.queue.showList(bucket.lang) as MessageEditOptions);
                } else if (ids[0] === 'refreshSearch') {
                    // search again
                    bucket.queue.search(null);
                    await interaction.update(bucket.queue.showList(bucket.lang, 0, true) as MessageEditOptions);
                }
            }
        } else if (interaction.isCommand()) {
            if (interaction.commandName === 'attach') {
                Commands.register(interaction.guild, bucket?.lang);
                if (bucket.connect(interaction)) {
                    await interaction.reply(`☆${(messages.hello as langMap)[bucket.lang]} ${Util.randomHappy()} ☆`);
                } else {
                    await interaction.reply(`${(messages.attach_fail as langMap)[bucket.lang]} ${Util.randomCry()}`);
                }
            } else if (interaction.commandName === 'detach') {
                bucket.player.pause();
                bucket.disconnect();
                await interaction.reply(`${(messages.detach as langMap)[bucket.lang]} ${Util.randomHappy()}`);
            } else if (interaction.commandName === 'append') {
                await interaction.deferReply();
                const url = interaction.options.get('youtube')?.value as string;
                if (!ytdl.validateURL(url) && !ytdl.validateID(url)) {
                    await interaction.editReply(Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                        `${(messages.song_is_not_found as langMap)[bucket.lang]} ${Util.randomCry()}`, true));
                    return;
                }
                const res = await ytdl.getInfo(url);
                const info = MusicInfo.fromDetails(res);

                if (info !== null) {
                    bucket.queue.add(info);
                    await interaction.editReply(new MessagePayload(interaction, Util.createEmbedMessage((messages.appended_to_the_playlist as langMap)[bucket.lang], info.title)));
                } else {
                    await interaction.editReply(new MessagePayload(interaction, Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                        `${(messages.song_is_not_found as langMap)[bucket.lang]} ${Util.randomCry()}`, true)));
                }
            } else if (interaction.commandName === 'pause' || interaction.commandName === 'resume') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                } else if (interaction.commandName === 'pause' && bucket.player.pause()) {
                    await interaction.reply((messages.paused as langMap)[bucket.lang]);
                } else if (interaction.commandName === 'resume' && bucket.player.unpause()) {
                    await interaction.reply((messages.resume as langMap)[bucket.lang]);
                } else {
                    await interaction.reply(new MessagePayload(interaction, Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                        `${(messages.pause_error as langMap)[bucket.lang]} ${Util.randomCry()}`, true)));
                }
            } else if (interaction.commandName === 'stop') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                } else {
                    bucket.player.pause();
                    bucket.queue.jump(0);
                    await interaction.reply((messages.stopped as langMap)[bucket.lang]);
                }
            } else if (interaction.commandName === 'repeat') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                } else {
                    var currentState: boolean = bucket.toggleRepeat();
                    if (currentState) {
                        await interaction.reply((messages.repeat_on as langMap)[bucket.lang]);
                    } else {
                        await interaction.reply((messages.repeat_off as langMap)[bucket.lang]);
                    }
                }
            } else if (interaction.commandName === 'list' || interaction.commandName === 'distinct') {
                if (interaction.commandName === 'distinct') {
                    // remove duplicate songs and show list
                    bucket.queue.removeDuplicate();
                }
                await interaction.reply(new MessagePayload(interaction, bucket.queue.showList(bucket.lang) as Options));
            } else if (interaction.commandName === 'search') {
                let query: RegExp | null = null;
                try {
                    query = new RegExp(interaction.options.get('regexp')?.value as string, "i");
                } catch (e) {
                    await interaction.reply(new MessagePayload(interaction, Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                        `Invalid Regular Expression ${Util.randomCry()}\n${e}`, true)));
                    return;
                }
                bucket.queue.search(query);
                await interaction.reply(new MessagePayload(interaction, bucket.queue.showList(bucket.lang, 0, true)));
            } else if (interaction.commandName === 'current') {
                var description: string = `Volume: ${bucket.volume}\n`;
                description += `Is playing: ${bucket.playing ? "yes" : "no"}\n`;
                description += `Number of songs: ${bucket.queue.len}`;
                await interaction.reply(new MessagePayload(interaction, Util.createEmbedMessage("current", description)));
                if (bucket.playing) {
                    await interaction.followUp(new MessagePayload(interaction, Util.createMusicInfoMessage(bucket.queue.current)));
                }
            } else if (interaction.commandName === 'jump' || interaction.commandName === 'go') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                    return;
                }
                await interaction.deferReply();
                const index = interaction.options.get('index')?.value as number;
                bucket.queue.jump(index);
                await bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
            } else if (interaction.commandName === 'swap') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                    return;
                }
                const index1 = interaction.options.get('index1')?.value as number;
                const index2 = interaction.options.get('index2')?.value as number;
                bucket.queue.swap(index1, index2);
                await interaction.reply("Done!");
            } else if (interaction.commandName === 'remove') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                    return;
                }
                const index = interaction.options.get('index')?.value as number;
                // if remove success
                if (bucket.queue.remove(index, bucket.playing)) {
                    await interaction.reply(new MessagePayload(interaction, Util.createEmbedMessage((messages.success as langMap)[bucket.lang],
                        `${(messages.removed_successfully as langMap)[bucket.lang]} ${Util.randomHappy()}`)));
                    return;
                }
                await interaction.reply(new MessagePayload(interaction, Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                    `${(messages.cannot_remove_the_playing_song as langMap)[bucket.lang]} ${Util.randomCry()}`, true)));
            } else if (interaction.commandName === 'clear') {
                if (bucket.playing) {
                    bucket.player.stop();
                }
                bucket.queue.removeAll();
                bucket.store();
                await interaction.reply((messages.playlist_is_reset as langMap)[bucket.lang]);
            } else if (interaction.commandName === 'sort') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                    return;
                }
                bucket.queue.sort();
                await interaction.reply(`${(messages.is_sorted as langMap)[bucket.lang]} ${Util.randomHappy()}`);
            } else if (interaction.commandName === 'shuffle') {
                bucket.queue.shuffle();
                await interaction.reply(`${(messages.is_shuffled as langMap)[bucket.lang]} ${Util.randomHappy()}`);
            } else if (interaction.commandName === 'next') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                    return;
                }
                let offset: number = 1;
                if (interaction.options.get("offset") != null) {
                    offset = interaction.options.get("offset")!.value as number;
                }
                await interaction.deferReply();
                bucket.queue.next(offset);
                await bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
            } else if (interaction.commandName === 'pre') {
                if (bucket.queue.isEmpty()) {
                    await interaction.reply((messages.playlist_is_empty_error as langMap)[bucket.lang]);
                    return;
                }
                await interaction.deferReply();
                bucket.queue.next(-1);
                await bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
            } else if (interaction.commandName === 'vol') {
                await interaction.deferReply();
                if (interaction.options.get('volume') === null) {
                    interaction.editReply(`${(messages.current_volume as langMap)[bucket.lang]}${bucket.volume}  ${Util.randomHappy()}`);
                } else {
                    const vol = interaction.options.get('volume')!.value as number;
                    if (vol < 0 || vol > 1) {
                        interaction.editReply(`${(messages.volume_format_error as langMap)[bucket.lang]} ${Util.randomCry()}`);
                    } else {
                        bucket.volume = vol;
                        interaction.editReply(`${(messages.volume_is_changed_to as langMap)[bucket.lang]}　${vol} ${Util.randomHappy()}`);
                    }
                }
            } else if (interaction.commandName === 'verbose') {
                bucket.verbose = interaction.options.get('truth')?.value as boolean;
                interaction.reply(new MessagePayload(interaction, Util.createEmbedMessage('verbose: ', bucket.verbose ? 'on' : 'off')));
            } else if (interaction.commandName === 'json') {
                await interaction.deferReply();
                if (interaction.options.get('json') === null) {
                    let batch = 100;
                    if (bucket.queue.isEmpty()) {
                        await interaction.reply((messages.playlist_is_empty as langMap)[bucket.lang]);
                    }
                    for (let j = 0; j < bucket.queue.len / batch; j++) {
                        let url: Array<string> = [];
                        for (let i = batch * j; i < Math.min(bucket.queue.len, batch * (j + 1)); i++) {
                            url.push(bucket.queue.list[i].url.replace('https://www.youtube.com/watch?v=', ''));
                        }
                        if (j == 0) {
                            await interaction.editReply('```\n' + JSON.stringify(url, null, '') + '\n```');
                        } else {
                            await interaction.followUp(`${j * batch}~${Math.min(bucket.queue.len, batch * (j + 1))}`);
                            await interaction.followUp('```\n' + JSON.stringify(url, null, '') + '\n```');
                        }
                    }
                } else {
                    let list: Array<string> = [];
                    try {
                        list = JSON.parse(interaction.options.get('json')!.value as string);
                        const downloadListener = Util.sequentialEnqueueWithBatchListener();
                        downloadListener.on('progress', (current, all) => {
                            interaction.editReply('```yaml\n' + Util.progressBar(current, all, progressBarLen) + '\n```');
                        });
                        downloadListener.once('done', (all, fail) => {
                            downloadListener.removeAllListeners();
                            interaction.editReply('```yaml\n' + Util.progressBar(all, all, progressBarLen) + ' ✅\n```' + `success: ${all - fail} / fail: ${fail}`);
                        });
                        downloadListener.once('error', (e) => {
                            downloadListener.removeAllListeners();
                            interaction.editReply(Util.createEmbedMessage('Error sequentialEnQueueWithBatch()', `${Util.randomCry()}\n${e}`, true));
                        });
                        Util.sequentialEnQueueWithBatch(list, bucket.queue, downloadListener);
                    } catch (e) {
                        await interaction.editReply(Util.createEmbedMessage('Error JSON.parse()', `${Util.randomCry()}\n${e}`, true));
                        return;
                    }
                }
            } else if (interaction.commandName === 'aqours' ||
                interaction.commandName === 'llss' ||
                interaction.commandName === 'genjitsu' ||
                interaction.commandName === 'azalea' ||
                interaction.commandName === 'muse' ||
                interaction.commandName === 'liella' ||
                interaction.commandName === 'nijigasaki' ||
                interaction.commandName === 'q4' ||
                interaction.commandName === 'hasunosora') {
                // fetch recommend music list
                let list = require('../recommend/' + interaction.commandName + '.json').list;

                // done message 
                let done: string = "";
                if (interaction.commandName === 'aqours' || interaction.commandName === 'llss' || interaction.commandName === 'genjitsu') {
                    done = 'Aqours SunShine!';
                } else if (interaction.commandName === 'azalea') {
                    done = '恋の喜び咲かせます、AZALEAです！ ';
                } else if (interaction.commandName === 'muse') {
                    done = "μ's music start!";
                } else if (interaction.commandName === 'liella') {
                    done = 'Song for me, song for you, song for all!';
                } else if (interaction.commandName === 'nijigasaki') {
                    done = "";
                }

                await interaction.deferReply();
                const downloadListener = Util.sequentialEnqueueWithBatchListener();
                downloadListener.on('progress', (current, all) => {
                    interaction.editReply('```yaml\n' + Util.progressBar(current, all, progressBarLen) + '\n```');
                });
                downloadListener.once('done', (all, fail) => {
                    interaction.editReply('```yaml\n' + Util.progressBar(all, all, 35) + ' ✅\n```' + `${done}`);
                });
                downloadListener.once('error', (e) => {
                    interaction.editReply(Util.createEmbedMessage('Error', `${Util.randomCry()}\n${e}`, true));
                });
                Util.sequentialEnQueueWithBatch(list, bucket.queue, downloadListener);
            } else if (interaction.commandName === '5yncri5e') {
                const file = fs.readFileSync(path.join(__dirname, '../recommend/5yncri5e.yaml'), 'utf-8');
                const list: {
                    lists: {
                        url: string
                        name: string
                    }[]
                } = YAML.parse(file);
                await interaction.deferReply();
                const downloadListener = Util.sequentialEnqueueWithBatchListener();
                downloadListener.on('progress', (current, all) => {
                    interaction.editReply('```yaml\n' + Util.progressBar(current, all, progressBarLen) + '\n```');
                });
                downloadListener.once('done', (all, fail) => {
                    interaction.editReply('```yaml\n' + Util.progressBar(all, all, 35) + ' ✅\n```');
                });
                downloadListener.once('error', (e) => {
                    interaction.editReply(Util.createEmbedMessage('Error', `${Util.randomCry()}\n${e}`, true));
                });
                Util.sequentialEnQueueWithBatch(list.lists.map(k=>k.url), bucket.queue, downloadListener);
            } else if (interaction.commandName === 'lang') {
                let lang: string = interaction.options.get('language')?.value as string;
                if (['zh', 'en'].includes(lang)) {
                    bucket.lang = lang;
                    await interaction.reply((messages.language_changed_successfully as langMap)[bucket.lang]);
                } else {
                    await interaction.reply("Should be either zh or en!");
                }
            } else {
                await interaction.reply("Command not found");
            }
        }
    });
}