import { Raid } from "./Raid";
import { Database } from "./Database";

export var commands: Array<string> = ["raid"];

let api: any;
let helper: any;
let log;
let pubsub: any;
let raid: Raid;
let db: Database;

export function constructor(api: any, helper: any, log: any, pubsub: any) {
    this.api = api;
    this.helper = helper;
    this.log = log;
    this.pubsub = pubsub;
    this.db = new Database(this.log);
    this.raid = new Raid(this.api, this.helper, this.log, this.pubsub, this.db);
}