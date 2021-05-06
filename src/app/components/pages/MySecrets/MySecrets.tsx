
import { createUseClassNames } from "app/theme/useClassNames";
import { cx } from "tss-react";
import { useEffect } from "react";
import { useConstCallback } from "powerhooks";
import { copyToClipboard } from "app/tools/copyToClipboard";
import { useSelector, useDispatch, useEvtSecretsManagerTranslation } from "app/interfaceWithLib/hooks";
import { Explorer as SecretOrFileExplorer } from "app/components/shared/Explorer";
import { Props as ExplorerProps } from "app/components/shared/Explorer";
import { MySecretsEditor } from "./MySecretsEditor";
import type { EditSecretParams } from "lib/useCases/secretExplorer";
import { PageHeader } from "app/components/shared/PageHeader";
import { useTranslation } from "app/i18n/useTranslations";
import { useWithProps } from "powerhooks";
import { relative as pathRelative } from "path";
import Link from "@material-ui/core/Link";
import { routes } from "app/router";
import { createGroup } from "type-route";
import { useSecretExplorerUserHomePath } from "app/interfaceWithLib/hooks";
import { useSplashScreen } from "app/components/shared/SplashScreen";
import type { Route } from "type-route";
import { thunks, pure } from "lib/setup";

MySecrets.routeGroup = createGroup([
    routes.mySecrets
]);

type PageRoute = Route<typeof MySecrets.routeGroup>;

MySecrets.requireUserLoggedIn = ()=> true;

export type Props = {
    route: PageRoute;
    className?: string;
};

const { useClassNames } = createUseClassNames<{}>()(
    () => ({
        "root": {
            "display": "flex",
            "flexDirection": "column"
        },
        "explorer": {
            "overflow": "hidden",
            "flex": 1,
            "width": "100%"
        }
    })
);


export function MySecrets(props: Props) {

    //TODO: Fix how routes are handled, can't navigate back for example.
    const { className, route } = props;

    const { t } = useTranslation("MySecrets");

    const state = useSelector(state => state.secretExplorer);
    const dispatch = useDispatch();

    const Explorer = useWithProps(
        SecretOrFileExplorer,
        {
            "type": "secret",
            "getIsValidBasename": pure.secretExplorer.getIsValidBasename
        }
    );

    useEffect(() => {

        if (state.state !== "FAILURE") {
            return;
        }

        alert(state.errorMessage);

    }, [state]);

    const onNavigate = useConstCallback(
        ({ kind, relativePath }: Parameters<ExplorerProps["onNavigate"]>[0]) =>
            dispatch((() => {
                switch (kind) {
                    case "directory":
                        return thunks.secretExplorer.navigateToDirectory({
                            "fromCurrentPath": true,
                            "directoryRelativePath": relativePath
                        });
                    case "file":
                        return thunks.secretExplorer.navigateToSecret({
                            "fromCurrentPath": true,
                            "secretRelativePath": relativePath
                        })
                }
            })())
    );


    const { secretExplorerUserHomePath: userHomePath } = useSecretExplorerUserHomePath();

    useEffect(
        () => {

            if (state.currentPath !== "") {
                return;
            }

            //We allow route to be null to be able to test in storybook
            const {
                secretOrDirectoryPath = userHomePath,
                isFile = false
            } = route?.params ?? {};

            dispatch(
                isFile ?
                    thunks.secretExplorer.navigateToSecret({
                        "fromCurrentPath": false,
                        "secretPath": secretOrDirectoryPath
                    }) :
                    thunks.secretExplorer.navigateToDirectory({
                        "fromCurrentPath": false,
                        "directoryPath": secretOrDirectoryPath
                    })
            );

        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    useEffect(
        () => {

            if (state.currentPath === "" || route === undefined) {
                return;
            }

            routes.mySecrets({
                ...(state.state === "SHOWING SECRET" ? { "isFile": true } : {}),
                "secretOrDirectoryPath": state.currentPath.replace(/^\//, "")
            }).push();

        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state.currentPath]
    );


    const onEditedBasename = useConstCallback(
        ({ kind, basename, editedBasename }: Parameters<ExplorerProps["onEditBasename"]>[0]) =>
            dispatch(
                thunks.secretExplorer.renameDirectoryOrSecretWithinCurrentDirectory({
                    "kind": (() => {
                        switch (kind) {
                            case "file": return "secret";
                            case "directory": return "directory"
                        }
                    })(),
                    basename,
                    "newBasename": editedBasename
                })
            )
    );

    const onDeleteItem = useConstCallback(
        async ({ kind, basename }: Parameters<ExplorerProps["onDeleteItem"]>[0]) => {

            console.log("TODO: Deletion started");

            await dispatch(
                thunks.secretExplorer.deleteDirectoryOrSecretWithinCurrentDirectory({
                    "kind": (() => {
                        switch (kind) {
                            case "file": return "secret";
                            case "directory": return "directory"
                        }
                    })(),
                    basename
                })
            );

            console.log("TODO: Deletion completed");

        }
    );

    const onCreateItem = useConstCallback(
        ({ kind, basename }: Parameters<ExplorerProps["onCreateItem"]>[0]) =>
            dispatch(
                thunks.secretExplorer.createSecretOrDirectory({
                    "kind": (() => {
                        switch (kind) {
                            case "file": return "secret";
                            case "directory": return "directory"
                        }
                    })(),
                    basename
                })
            )
    );

    const onCopyPath = useConstCallback(
        (params?: { path: string; }): void => {

            const { path } = params ?? { "path": state.currentPath };

            copyToClipboard(pathRelative(userHomePath, path));

        }
    );

    const { evtSecretsManagerTranslation } = useEvtSecretsManagerTranslation();

    const onEdit = useConstCallback(
        (params: EditSecretParams) =>
            dispatch(thunks.secretExplorer.editCurrentlyShownSecret(params))
    );

    const { classNames } = useClassNames({});

    const { showSplashScreen, hideSplashScreen } = useSplashScreen();

    useEffect(
        () => {
            if (state.currentPath === "") {
                showSplashScreen({ "enableTransparency": true });
            } else {
                hideSplashScreen();
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [state.currentPath === ""]
    );

    const doDisplayUseInServiceDialog = useSelector(
        state => state.userConfigs.doDisplayMySecretsUseInServiceDialog.value
    );

    const onDoDisplayUseInServiceDialogValueChange = useConstCallback(
        value => dispatch(
            thunks.userConfigs.changeValue({
                "key": "doDisplayMySecretsUseInServiceDialog",
                value
            })
        )
    );

    if (state.currentPath === "") {
        return null;
    }

    return (
        <div className={cx(classNames.root, className)}>
            <PageHeader
                icon="secrets"
                text1={t("page title")}
                text2={t("what this page is used for")}
                text3={<>
                    {t("watch the video")}
                    <Link
                        href="https://github.com/InseeFrLab/onyxia-ui/releases/download/assets/Demo_My_Secrets.mp4"
                        target="_blank"
                    >
                        {t("here")}
                    </Link>
                </>}
            />
            <Explorer
                className={classNames.explorer}
                browsablePath={userHomePath}
                currentPath={state.currentPath}
                isNavigating={state.isNavigationOngoing}
                evtTranslation={evtSecretsManagerTranslation}
                showHidden={false}
                file={
                    state.state !== "SHOWING SECRET" ? null :
                        <MySecretsEditor
                            onCopyPath={onCopyPath}
                            isBeingUpdated={state.isBeingUpdated}
                            secretWithMetadata={state.secretWithMetadata}
                            onEdit={onEdit}
                            doDisplayUseInServiceDialog={doDisplayUseInServiceDialog}
                            onDoDisplayUseInServiceDialogValueChange={onDoDisplayUseInServiceDialogValueChange}
                        />
                }
                fileDate={
                    state.state !== "SHOWING SECRET" ?
                        undefined :
                        new Date(state.secretWithMetadata.metadata.created_time)
                }
                files={state.secrets}
                directories={state.directories}
                directoriesBeingCreated={
                    state.state !== "SHOWING DIRECTORY" ? [] :
                        state.directoriesBeingCreated
                }
                directoriesBeingRenamed={
                    state.state !== "SHOWING DIRECTORY" ? [] :
                        state.directoriesBeingRenamed

                }
                filesBeingCreated={
                    state.state !== "SHOWING DIRECTORY" ? [] :
                        state.secretsBeingCreated
                }
                filesBeingRenamed={
                    state.state !== "SHOWING DIRECTORY" ? [] :
                        state.secretsBeingRenamed
                }
                onNavigate={onNavigate}
                onEditBasename={onEditedBasename}
                onDeleteItem={onDeleteItem}
                onCreateItem={onCreateItem}
                onCopyPath={onCopyPath}
            />
        </div>
    );
};


export declare namespace MySecrets {

    export type I18nScheme = {
        'page title': undefined;
        'what this page is used for': undefined;
        'watch the video': undefined;
        'here': undefined;
    };

}