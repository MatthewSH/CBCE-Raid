import * as lowdb from "lowdb";
import * as FileSync from "lowdb/adapters/FileSync";

export class Database {
    private db: lowdb.LowdbSync<any>;

    public constructor(private log: any) {
        this.db = lowdb(new FileSync("raid.json"));

        this.db.defaultsDeep({
            config: {
                defaultBuyIn: 100,
                minimumBuyIn: 100,
                announceAfterCooldown: true,
                randomDungeonName: true,
                timers: {
                    joining: 45,
                    raiding: 60,
                    cooldown: 120
                }
            },
        }).write();
    }

    public database(): lowdb.LowdbSync<any> {
        return this.db;
    }

    public config(): any {
        return this.db.get("config").value();
    }

}