#!/usr/bin/env node
import commander from 'commander';
import {main} from './main';
import 'process';

commander.program.version('0.0.4', '-v, --version', 'output the current version');
commander.program
    .addOption(new commander.Option('-t, --token <discord_bot_token>', 'specify the discord bot token').default(''))
    .parse(process.argv);

const options = commander.program.opts();

let token: string = options.token;

if(token == ""){
    process.stdout.write("please input token: ");
    process.stdin.setEncoding('utf-8');
    process.stdin.on('readable', () => {
        const input = process.stdin.read();
        if (input !== null) {
            token = input.trim();
            main(token);
        }
    });
}else{
    main(token);
}


process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
