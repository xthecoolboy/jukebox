import { ClientEvent, IVoiceState } from "../../typings";
import Jukebox from "../structures/Jukebox";
import { MessageEmbed } from "discord.js";
import { parseDur } from "../utils/parseDur";

export default class ReadyEvent implements ClientEvent {
    readonly name = "voiceStateUpdate";
    constructor(private client: Jukebox) {}

    public execute(oldState: IVoiceState, newState: IVoiceState): any {
        if (newState.guild.queue) {
            const oldID = oldState.channel ? oldState.channel.id : undefined;
            const newID = newState.channel ?  newState.channel.id : undefined;

            // Handle when bot gets kicked from the voice channel
            if (oldState.id === this.client.user!.id && oldID === newState.guild.queue.voiceChannel!.id && newID === undefined) {
                newState.guild.queue.textChannel!.send(new MessageEmbed().setDescription("I'm disconnected from the voice channel, the queue will be deleted").setColor("#FFFF00"));
                return newState.guild.queue = null;
            }

            // Handle when the bot is moved to another voice channel
            if (oldState.id === this.client.user!.id && oldID === newState.guild.queue.voiceChannel!.id && newID !== newState.guild.queue.voiceChannel!.id) {
                return newState.guild.queue.voiceChannel = newState.channel;
            }

            // Handle when user leaves voice channel
            const vc = newState.guild.queue.voiceChannel!.members.filter(m => !m.user.bot);
            if (oldID === newState.guild.queue.voiceChannel!.id && newID === undefined && !newState.member!.user.bot) {
                if (!vc.size) {
                    clearTimeout(newState.guild.queue.timeout!);
                    newState.guild.queue.timeout = null;
                    newState.guild.queue.playing = false;
                    newState.guild.queue.connection!.dispatcher.pause();
                    const timeout = this.client.config.deleteQueueTimeout;
                    const duration = parseDur(timeout);
                    newState.guild.queue.textChannel!.send(new MessageEmbed().setTitle("⏸ Queue paused.").setColor("#FFFF00")
                        .setDescription("Currently, no one is the in the voice channel, to save resources, the queue was pasued. "
                            + `if there's no people the in voice channel in the next ${duration}, the queue will be deleted.`));
                    return newState.guild.queue.timeout = setTimeout(() => {
                        newState.guild.queue!.textChannel!.send(new MessageEmbed().setTitle("⏹ Queue deleted.").setColor("#FF0000")
                            .setDescription(`${duration} have passed and there is no one who joins the voice channel, the queue was deleted.`));
                        newState.guild.queue!.songs.clear();
                        newState.guild.queue!.connection!.disconnect();
                        return newState.guild.queue = null;
                    }, timeout);
                }
            }

            // Handle when user joins voice channel
            if (newID === newState.guild.queue.voiceChannel!.id && !newState.member!.user.bot) {
                if (vc.size > 0) {
                    if (vc.size === 1) { clearTimeout(newState.guild.queue.timeout!); newState.guild.queue.timeout = null; }
                    if (newState.guild.queue.playing === false && vc.size < 2) {
                        newState.guild.queue.textChannel!.send(new MessageEmbed().setTitle("▶ Queue resumed").setColor("#00FF00")
                            .setDescription(`Someones joins te voice channel. Enjoy the music 🎶\nNow Playing: **${newState.guild.queue.songs.first()!.title}**`));
                        newState.guild.queue.playing = true;
                        try {
                            newState.guild.queue.connection!.dispatcher.resume();
                        } catch (e) {
                            this.client.log.error("VOICE_STATE_UPDATE_EVENT_ERR:", e);
                        }
                    }
                }
            }
        }
    }
}
