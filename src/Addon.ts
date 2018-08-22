// ChatBotCE 
import { API } from "chatbotce/typings/lib/API";
import { Helper } from "chatbotce/typings/lib/Helpers";
import { PubSub } from "chatbotce/typings/lib/PubSub";

import { Raid } from "./Raid";
import { Database } from "./Database";

export var commands: Array<string> = ["raid"];

let api: API;
let helper: Helper;
let log;
let pubsub: PubSub;
let raid: Raid;
let db: Database;

export function constructor(api: API, helper: Helper, log: any, pubsub: PubSub) {
    this.api = api;
    this.helper = helper;
    this.log = log;
    this.pubsub = pubsub;
    this.db = new Database(this.log);
    this.raid = new Raid(this.api, this.helper, this.log, this.pubsub, this.db);
}