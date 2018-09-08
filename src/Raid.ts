import { Database } from "./Database";
import { Dungeon } from "./Dungeon";
import { Crypto } from "./Crypto";

let stopwatch = require("timer-stopwatch");

export class Raid {
    private currentDungeonName: string = "";
    private joining: boolean = false;
    private started: boolean = false;
    private inCooldown: boolean = false;
    private buyInAmount: number = 100;
    private defaultBuyInAmount: number = 100;
    private minBuyInAmount: number = 100;
    private cooldownTime: number = 30000; 
    private joiningTime: number = 60000;
    private raidingTime: number = 15000;
    private players: Array<string> = [];
    private playersName: Array<string> = [];
    private timerCooldown = new stopwatch(this.cooldownTime);
    private timerJoining = new stopwatch(this.joiningTime);
    private timerRaid = new stopwatch(this.raidingTime);
    private currencyTemplate: string;

    public constructor(private api: any, private helper: any, private log: any, private pubsub: any, private db: Database) {
        this.cooldownTime = this.db.config().timers.cooldown * 1000;
        this.raidingTime = this.db.config().timers.raiding * 1000;
        this.joiningTime = this.db.config().timers.joining * 1000;
        this.defaultBuyInAmount = Number(this.db.config().defaultBuyIn);
        this.minBuyInAmount = Number(this.db.config().minimumBuyIn);
        this.buyInAmount = this.defaultBuyInAmount;
        this.currencyTemplate = this.sendPub("currency.format", null, -1);
    }

    public execute(command: any, parameters: Array<string>, message: any): void {
        if (this.inCooldown) {
            this.api.say("We have to wait for the next raid.");
            
            return;
        }

        if (parameters === null || parameters.length < 1 || (parameters !== null && parameters.length >= 1 && !isNaN(parseInt(parameters[0])))) {
            if (this.joining) {
                this.api.say("The raid is already in the joining stage. Join with " + process.env.COMMAND_PREFIX + "raid join");
            } else if (this.started) {
                this.api.say("The raid has already started, please wait for the next raid.");
            } else {
                this.timerCooldown = new stopwatch(this.cooldownTime);
                this.timerJoining = new stopwatch(this.joiningTime);
                this.timerRaid = new stopwatch(this.raidingTime);

                if (parameters !== null && parameters.length >= 1 && !isNaN(parseInt(parameters[0]))) {
                    this.buyInAmount = Number(parameters[0]);

                    if (this.buyInAmount < this.minBuyInAmount) {
                        this.api.say(`The raid buyin must be ${this.currencyTemplate.replace("-1", this.helper.withCommas(this.minBuyInAmount))} or more!`);
                        return;
                    }
                } else {
                    this.buyInAmount = this.defaultBuyInAmount;
                }

                this.currentDungeonName = Dungeon.generateName();
                this.api.say(`Starting raid for "${this.currentDungeonName}". Join with ${process.env.COMMAND_PREFIX}raid join`);
                this.start();
                this.join(message.userId, message.username);
            }
        } else if (parameters[0].toLowerCase() === "join") {
            this.join(message.userId, message.username);
        } else if (parameters[0].toLowerCase() === "list") {
            if (this.started || this.joining) {
                this.api.say(`Raid Party (${this.players.length}): ${this.playersName.join(", ")}`);
            }

            return;
        } else if (parameters[0].toLowerCase() === "status") {
            let msg = "Raid Status: ";

            if (this.inCooldown) {
                msg += "In Cooldown";
            } else if (this.joining) {
                msg += "Joining/Preparation";
            } else if (this.started) {
                msg += "Started/Raiding";
            }

            this.api.say(msg);
            return;
        } else if (parameters[0].toLowerCase() === "info") {
            if (this.inCooldown) {
                this.api.say(`Raid is in cooldown mode.`);
                return;
            }

            this.api.say(`"${this.currentDungeonName}." Cost: ${this.currencyTemplate.replace("-1", this.helper.withCommas(this.buyInAmount))}. Member Count: ${this.players.length}. `);
            return;
        }
    }

    private join(userId: string, username: string): void {
        if (!this.sendPub("hasBalance", userId, this.buyInAmount)) {
            this.api.say(`Sorry, ${username}, but you must have at least ${this.currencyTemplate.replace("-1", this.helper.withCommas(this.buyInAmount))} coins to join the raid.`);
            return;
        }

        if (this.players.length >= 10) {
            this.api.say(`Sorry ${username} we have a full party (max 10 people).`);
            return;
        }

        if (this.inCooldown) {
            this.api.say(`${username}, we're in cooldown mode. Calm yourself.`);
            return;
        }

        if (this.started) {
            this.api.say(`${username}, you can not join a raid that is in progress!`);
            return;
        }

        if (this.players.indexOf(userId) < 0) {
            this.api.say(`${username} has joined the raid!`);
            this.players.push(userId);
            this.playersName.push(username);
            this.sendPub("decrementBalance", userId, this.buyInAmount);
            return;
        } else {
            this.api.say(`${username}, you're already a part of this raid.`);
            return;
        }
    }

    private start(): void {
        this.joining = true;
        this.players = [];
        this.playersName = [];
        
        this.timerJoining.start();

        this.timerJoining.on("almostdone", () => {
            this.api.say("The raid is starting in 10 seconds.");
        });

        this.timerJoining.on("done", () => {
            this.joining = false;
            return this.raid();
        });
    }

    private raid(): void {
        if (this.players.length < 1) {
            this.api.say(`The raid for "${this.currentDungeonName}" has been cancelled due to lack of interest.`);
            return this.stop();
        }

        this.started = true;

        let totalBuyIn = this.players.length * this.buyInAmount;
        let minLoot = totalBuyIn * 1.5;
        let maxLoot = (this.players.length > 2 ) ? (totalBuyIn * this.players.length) : (totalBuyIn * 2);
        let loot = Crypto.randomNumber(minLoot, maxLoot);

        let successChance = (this.players.length > 4) ? Math.floor(5 + (this.players.length * 5)) : Math.floor(7 + (this.players.length * 6));

        let iterations = 1;
        let wins = 0;
        let loses = 0;

        if ((loot / 2500) > 1) {
            iterations = Math.ceil(loot / 2500);
        }

        if (this.buyInAmount > 100) {
            let moreChance = Math.floor(this.buyInAmount / 100) < 15 ? Math.floor(this.buyInAmount / 100) : 15;
            successChance = successChance + moreChance;
        }


        this.api.say(`The raid for "${this.currentDungeonName}" has begun. We have a ${successChance}% chance of success. We're looking at a total loot of ${this.currencyTemplate.replace("-1", this.helper.withCommas(loot))}.`);
        this.api.say(`Raid Party (${this.players.length}): ${this.playersName.join(", ")}`);

        this.timerRaid.start();

        this.timerRaid.on("done", () => {
            let result: number;

            for (let i = 0; i < iterations; i++) {
                result = Crypto.randomNumber(1, 100);

                if (result <= successChance) {
                    wins++;
                } else {
                    loses++;
                }
            }

            this.log.info(`"${this.currentDungeonName}" - ${iterations} rounds/iterations ran. ${wins} wins, ${loses} loses.`);

            if (wins >= loses) {
                let remainder = loot % this.players.length;
                loot = loot - remainder;

                let lootSplit = Math.floor(loot / this.players.length);

                this.players.forEach(player => {
                    this.sendPub("incrementBalance", player, lootSplit);
                });

                this.sendPub("incrementBalance", this.players[0], remainder);

                this.api.say(`The raid on "${this.currentDungeonName}" was a success! Everyone got ${lootSplit} coins and ${this.playersName[0]} got and extra ${this.currencyTemplate.replace("-1", this.helper.withCommas(remainder))} as a finders fee.`);
            } else {
                let charityCase = Math.floor((((loot) / iterations) * wins) - this.buyInAmount);

                if (charityCase > 0) {
                    this.players.forEach(player => {
                        this.sendPub("incrementBalance", player, charityCase);
                    });
    
                    this.api.say(`Well, we attempted the raid on "${this.currentDungeonName}," but we lost. Each ${this.currencyTemplate.replace("-1", this.helper.withCommas(this.buyInAmount))} buyin was spent on medical bills, but each person did get ${this.currencyTemplate.replace("-1", this.helper.withCommas(charityCase))} back!`);
                } else {
                    this.api.say(`Well, we attempted the raid on "${this.currentDungeonName}," but we lost. Each ${this.currencyTemplate.replace("-1", this.helper.withCommas(this.buyInAmount))} buyin was spent on medical bills.`);
                }
            }


            this.started = false;
            return this.stop();
        });
    }

    private stop(): void {
        this.inCooldown = true;
        this.players = [];
        this.playersName = [];

        this.timerCooldown.start();

        this.timerCooldown.on("done", () => {
            this.started = false;
            this.joining = false;
            this.inCooldown = false;

            if (this.db.config().announceAfterCooldown) {
                this.api.say("Our crew is all rested up. Let's get back to work. You can now start a new raid.");
            }
        });
    }
    
    private getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private sendPub(topic: string, userId: string, amount: number, data?: object) {
        return this.pubsub.publish(`economy.${topic}`, {
            userId: userId,
            amount: amount
        });
    }
}