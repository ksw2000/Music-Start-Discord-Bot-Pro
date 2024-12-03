#!/usr/bin/env node
import commander from 'commander';
import { main } from './main';
import { version } from '../package.json';
import 'process';

commander.program.version(version, '-v, --version', 'output the current version');
commander.program
    .addOption(new commander.Option('-t, --token <discord_bot_token>', 'specify the discord bot token').default(''))
    .addOption(new commander.Option('-d, --disable-log', 'do not save and load the log file'))
    .parse(process.argv);

const options = commander.program.opts();

let token: string = options.token;
const optDisableLog = options.disableLog;
let useLog: boolean = true;

if (optDisableLog) {
    useLog = false;
}

if (token == "") {
    process.stdout.write("please input token: ");
    process.stdin.setEncoding('utf-8');
    process.stdin.on('readable', () => {
        const input = process.stdin.read();
        if (input !== null) {
            token = input.trim();
            main(token, useLog);
        }
    });
} else {
    main(token, useLog);
}

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
