import { Synchronizer } from "./synchronizer";

export class Synchronizers {

    public readonly collections: Synchronizers.Dictionary = {};
    
    constructor(collectionBuilder: Synchronizers.BuilderDictionary) {
        for (const stateName in collectionBuilder) {
            const synchronizers = collectionBuilder[stateName];
            this.collections[stateName] = new Synchronizer.Collection<any>(...synchronizers);
        }
    }

    public setCollection<T>(stateName: string, collection: Synchronizer.Collection<T>) {
        this.collections[stateName] = collection;
    }

    public getCollection<T>(stateName: string): Synchronizer.Collection<T> {
        const collection = this.collections[stateName] as Synchronizer.Collection<T>;

        if (collection) {
            return collection;
        }
        else {
            throw new Error(`No synchronizer collection defined for state name "${stateName}".`);
        }
    }
}

export namespace Synchronizers {

    export type Dictionary = {
        [stateName: string]: Synchronizer.Collection<any>
    };

    export type BuilderDictionary = {
        [stateName: string]: Synchronizer<any, any>[]
    };
}