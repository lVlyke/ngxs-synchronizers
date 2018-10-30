import { Injector, ModuleWithProviders, NgModule,  } from "@angular/core";
import { Synchronizers } from "./sychronizers";
import { SyncStore } from "./sync-store";

@NgModule({
    providers: [
        SyncStore
    ]
})
export class NgxsSyncModule {

    public static withSynchronizers(synchronizerCollectionBuilder: Synchronizers.BuilderDictionary): ModuleWithProviders {

        return {
            ngModule: NgxsSyncModule,
            providers: [
                {
                    provide: "BuilderDictionary",
                    useValue: synchronizerCollectionBuilder
                },
                {
                    deps: [Injector, "BuilderDictionary"],
                    provide: Synchronizers,
                    useClass: Synchronizers
                }
            ]
        };
    }
}
