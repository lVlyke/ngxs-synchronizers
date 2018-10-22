import { NgModule, ModuleWithProviders, Injector } from "@angular/core";
import { SyncStore } from "./sync-store";
import { Synchronizers } from "./sychronizers";

@NgModule({
    providers: [
        SyncStore
    ]
})
export class NgxsSyncModule {

    public static withSynchronizers(synchronizerCollectionBuilder: Synchronizers.BuilderDictionary): ModuleWithProviders {

        function SYNCHRONIZERS_FACTORY(injector: Injector): Synchronizers {
            return new Synchronizers(injector, synchronizerCollectionBuilder);
        }

        return {
            ngModule: NgxsSyncModule,
            providers: [
                {
                    provide: Synchronizers,
                    useFactory: SYNCHRONIZERS_FACTORY,
                    deps: [Injector]
                }
            ]
        };
    }
}