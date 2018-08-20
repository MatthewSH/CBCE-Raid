export var commands: Array<string> = ["raid"];

let api;
let helper;
let log;
let pubsub;

export function constructor(api: any, helper: any, log: any, pubsub: any) {
    this.api = api;
    this.helper = helper;
    this.log = log;
    this.pubsub = pubsub;
};

export var raid: Object = {
    execute: () => {
        //
    }
}