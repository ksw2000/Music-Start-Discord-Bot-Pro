#!/usr/bin/env node
import commander from 'commander';
import {main} from './main';

commander.program.version('0.0.4', '-v, --version', 'output the current version')
commander.program
    .addOption(new commander.Option('-t, --token <discord_bot_token>', ''))
    .parse(process.argv)
const options = commander.program.opts()

let token: string = options.token;
if (token === "") {
    token = process.env.DiscordToken || "";
    // || require('./token.json').token;
}

if (token === "") {
    console.error("token not found...");
}else{
    main(token);
}
