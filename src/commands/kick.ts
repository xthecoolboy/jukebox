import * as Discord from 'discord.js';
import {IBotCommand} from '../api';

export default class kick implements IBotCommand {
    private readonly _command = 'kick';

    help(): string {
        return 'Admin only | Kicks the mentioned user';
    }

    isCommand(command: string): boolean {
        return command === this._command;
    }

    runCommand(args: string[], msgObject: Discord.Message, client: Discord.Client): void {
        const mentionedUser = msgObject.mentions.users.first();
        const suppliedReason =
            args.slice(1).join(' ') || `${msgObject.author.username} did not supply reason.`;
        const kickLog = `${msgObject.author.username}: ${suppliedReason}`;

        msgObject.delete(0);

        if (!msgObject.member.hasPermission('ADMINISTRATOR')) {
            msgObject.channel
                .send(`Sorry ${msgObject.author.username}, but you don't have permission to do that!`)
                .then(msg => {
                    (msg as Discord.Message).delete(5000);
                });
            return;
        }

        if (!mentionedUser) {
            msgObject.channel
                .send(`Sorry ${msgObject.author.username}, I couldn't find that user!`)
                .then(msg => {
                    (msg as Discord.Message).delete(5000);
                });
            return;
        }

        msgObject.guild
            .member(mentionedUser)
            .kick(kickLog)
            .then(console.log)
            .catch(console.error);
    }
}
