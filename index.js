const electron = require("electron");
electron.app.setAppLogsPath();
if (electron.app.requestSingleInstanceLock()) {
    const {
        resolve,
        join,
        basename,
        extname
    } = require("node:path");
    const {
        Socket
    } = require("node:net");
    const {
        randomBytes
    } = require("node:crypto");
    const {
        writeFileSync,
        unlinkSync,
        readdirSync
    } = require("node:fs");
    const {
        EventEmitter
    } = require("node:events");
    const electronStore = require("electron-store");
    const packagejson = require(resolve(join(__dirname, "package.json")));
    const protocol = packagejson.protocol;
    if (process.defaultApp && process.argv.length >= 2) electron.app.setAsDefaultProtocolClient(protocol, process.execPath, [resolve(process.argv[1])]);
    else electron.app.setAsDefaultProtocolClient(protocol);
    electron.app.on("window-all-closed", () => {
        if (process.platform != "darwin") return electron.app.quit();
    });
    return electron.app.whenReady().then(() => {
        const isDev = "ELECTRON_IS_DEV" in process.env ? parseInt(process.env.ELECTRON_IS_DEV, 10) == 1 && electron.app.isPackaged == false : electron.app.isPackaged == false;
        const icon = resolve(join(__dirname, "icon.ico"));
        const name = packagejson.name;
        const author = packagejson.author;
        const linkProject = String(packagejson.repository.url).split(".git")[0];
        const displayName = packagejson.displayName;
        const defaultUrl = {
            base: packagejson.url,
            full: packagejson.url
        };
        const is = new class {
            string(value) {
                return typeof value == "string" ? value.length > 0 : false;
            };

            number(value) {
                return isNaN(Number(value)) == false;
            };

            array(value) {
                return Array.isArray(value) == true ? value.length > 0 : false;
            };

            json(value) {
                try {
                    value = this.string(value) == false ? JSON.parse(JSON.stringify(value)) : JSON.parse(value);
                    if (typeof value == "object" && value != null) {
                        if (Object.keys(value).length > 0) return true;
                        else return false;
                    } else return false;
                } catch (error) {
                    return false;
                };
            };

            url(value) {
                try {
                    new URL(value);
                    return true;
                } catch (error) {
                    return false;
                };
            };

            deepUrl(value) {
                try {
                    return new URL(value).protocol == `${protocol}:`;
                } catch (error) {
                    return false;
                };
            };
        };
        const parse = value => {
            try {
                return is.string(value) == false ? JSON.parse(JSON.stringify(value)) : JSON.parse(value);
            } catch (error) {
                return undefined;
            };
        };
        const deepLinkToUrl = value => {
            try {
                const deepLink = new URL(value);
                if (deepLink.host <= 0) return defaultUrl.base;
                else return `${defaultUrl.base}/${deepLink.host}${deepLink.pathname}${deepLink.search}`;
            } catch (error) {
                return defaultUrl.base;
            };
        };
        let settingsSchema = {};
        settingsSchema[packagejson.exeName] = {
            type: "object",
            default: {
                LANGUAGE: undefined,
                START_UP: false,
                START_HIDDEN: false,
                START_FULL_SCREEN: false,
                MINIMIZE_TO_TRAY: false,
                SAVE_WINDOW_SIZE: false,
                ALWAYS_ON_TOP: false,
                ADBLOCK: false,
                DISCORD_RICH_PRESENCE: false
            }
        };
        const settings = new electronStore({
            name: "settings",
            watch: true,
            schema: settingsSchema
        });
        let profileSchema = {};
        profileSchema[packagejson.exeName] = {
            type: "object",
            default: {
                history: {

                },
                watchlist: {

                },
                favorite: {

                }
            }
        };
        const profile = new electronStore({
            name: "profile",
            watch: true,
            schema: profileSchema
        });
        if (!profile.has(packagejson.exeName) || !is.json(profile.get(packagejson.exeName))) profile.set(packagejson.exeName, {});
        const historyProfile = `${packagejson.exeName}.history`;
        if (!profile.has(historyProfile) || !is.json(profile.get(historyProfile))) profile.set(historyProfile, {});
        const watchlistProfile = `${packagejson.exeName}.watchlist`;
        if (!profile.has(watchlistProfile) || !is.json(profile.get(watchlistProfile))) profile.set(watchlistProfile, {});
        const favoriteProfile = `${packagejson.exeName}.favorite`;
        if (!profile.has(favoriteProfile) || !is.json(profile.get(favoriteProfile))) profile.set(favoriteProfile, {});
        const screen = electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint());
        const size = screen.workAreaSize;
        const factor = screen.scaleFactor;
        const splashWindow = new electron.BrowserWindow({
            width: 542,
            height: 132,
            title: displayName,
            show: false,
            resizable: false,
            minimizable: true,
            maximizable: false,
            fullscreenable: false,
            titleBarStyle: "hidden",
            titleBarOverlay: {
                color: "#000",
                symbolColor: "#FFF"
            },
            center: true,
            frame: false,
            icon: icon,
            webPreferences: {
                devTools: false,
                zoomFactor: 1.0 / factor,
                nativeWindowOpen: true
            }
        });
        splashWindow.setMenuBarVisibility(false);
        splashWindow.hookWindowMessage(0x0116, () => {
            splashWindow.setEnabled(false);
            splashWindow.setEnabled(true);
        });
        splashWindow.on("system-context-menu", event => event.preventDefault());
        splashWindow.on("closed", () => electron.app.exit());
        return splashWindow.loadFile(resolve(join(__dirname, "splash.html"))).then(() => {
            defaultUrl.full = deepLinkToUrl(process.argv.find(arg => is.deepUrl(arg) == true));
            let isHidden = settings.get(`${packagejson.exeName}.START_HIDDEN`);
            if (!isHidden) splashWindow.show();
            const createWindow = () => {
                if (!settings.has(`${packagejson.exeName}.WIDTH`) || settings.get(`${packagejson.exeName}.WIDTH`) > size.width) settings.set(`${packagejson.exeName}.WIDTH`, Math.round((size.width - (Math.abs((size.width * 0.6) / 2 - size.width / 2)))));
                if (!settings.has(`${packagejson.exeName}.HEIGHT`) || settings.get(`${packagejson.exeName}.HEIGHT`) > size.height) settings.set(`${packagejson.exeName}.HEIGHT`, Math.round((size.height - (Math.abs((size.height * 0.6) / 2 - size.height / 2)))));
                const mainWindow = new electron.BrowserWindow({
                    width: settings.get(`${packagejson.exeName}.WIDTH`),
                    height: settings.get(`${packagejson.exeName}.HEIGHT`),
                    title: displayName,
                    center: true,
                    show: false,
                    fullscreen: settings.get(`${packagejson.exeName}.START_FULL_SCREEN`),
                    icon: icon,
                    webPreferences: {
                        devTools: isDev == true,
                        zoomFactor: 1.0 / factor,
                        nativeWindowOpen: true,
                        preload: resolve(join(__dirname, "preload.js"))
                    }
                });
                const discordRichPresence = new class extends EventEmitter {
                    #socket = undefined;
                    #status = undefined;
                    #interval = undefined;

                    has() {
                        return settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`) ? typeof this.#socket != "undefined" ? (this.#socket.closed == false || this.#socket.destroyed == false) : this.#status == "CONNECTED" : false;
                    };

                    set() {
                        if (this.has()) {
                            let buttons;
                            if (is.array(this.buttons)) {
                                const filter = this.buttons.filter(data => is.json(data) == true && is.string(data.label) == true && is.url(data.url) == true);
                                if (filter.length == 1) buttons = [filter[0]];
                                else if (filter.length >= 2) buttons = [filter[0], filter[1]];
                            };
                            const str = JSON.stringify({
                                cmd: "SET_ACTIVITY",
                                nonce: randomBytes(16).toString("hex"),
                                args: {
                                    pid: this.pid,
                                    activity: {
                                        state: this.state,
                                        details: this.details,
                                        timestamps: {
                                            start: (this.elapsedTimestamp || this.startTimestamp == true) && isNaN(this.startTimestamp) == true ? Date.now() : this.startTimestamp,
                                            end: this.endTimestamp
                                        },
                                        assets: {
                                            large_image: this.largeImage,
                                            large_text: this.largeImageTooltip,
                                            small_image: this.smallImage,
                                            small_text: this.smallImageTooltip
                                        },
                                        type: !isNaN(this.type) ? this.type : 0,
                                        buttons: buttons,
                                        instance: this.instance
                                    }
                                }
                            });
                            const len = Buffer.byteLength(str);
                            const packet = Buffer.alloc(8 + len);
                            packet.writeInt32LE(1, 0);
                            packet.writeInt32LE(len, 4);
                            packet.write(str, 8, len);
                            if (this.#socket.write(packet)) {
                                this.emit("running");
                                this.#status = "RUNNING";
                                if (typeof this.interval != "undefined") {
                                    clearInterval(this.interval);
                                    this.interval = undefined;
                                };
                            };
                        } else if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) {
                            this.#socket = new Socket();
                            this.#socket.setEncoding("utf8");
                            this.#socket.setKeepAlive(true);
                            this.#socket.on("connect", () => {
                                this.emit("connected");
                                this.#status = "CONNECTED";
                            });
                            this.#socket.on("data", data => {
                                if (is.string(data)) data = `{${data.toString().substring(data.toString().indexOf("{") + 1)}`;
                                if (is.json(data)) {
                                    data = JSON.parse(data);
                                    if (data.evt == "READY" && data.cmd == "DISPATCH") return this.set();
                                    else if (data.evt == "ERROR") return this.#socket.emit("error", new Error("TR.DISCORD_RICH_PRESENCE.LOST"));
                                };
                            });
                            this.#socket.on("error", () => {
                                this.emit("error");
                                this.#status = "ERROR";
                                if (typeof this.#interval == "undefined") this.#interval = setInterval(() => {
                                    if (this.has()) {
                                        clearInterval(this.#interval);
                                        this.#interval = undefined;
                                    } else return this.set();
                                }, this.intervalTime);
                            });
                            this.#socket.on("close", error => {
                                if (!error) {
                                    if (!settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) {
                                        this.emit("disabled");
                                        if (this.#status != "DISABLED") this.#status = "DISABLED";
                                    } else {
                                        this.emit("closed");
                                        if (this.#status != "CLOSED") this.#status = "CLOSED";
                                    };
                                    if (typeof this.#interval == "undefined") this.#interval = setInterval(() => {
                                        if (this.has()) {
                                            clearInterval(this.#interval);
                                            this.#interval = undefined;
                                        } else return this.set();
                                    }, this.intervalTime);
                                } else {
                                    this.emit("closed");
                                    if (["ERROR", "DISABLED", "CLOSED"].some(key => this.#status != key)) this.#status = "CLOSED";
                                };
                            });
                            return this.#socket.connect("\\\\?\\pipe\\discord-ipc-0", () => {
                                const str = JSON.stringify({
                                    v: 1,
                                    client_id: this.clientId
                                });
                                const len = Buffer.byteLength(str);
                                let packet = Buffer.alloc(8 + len);
                                packet.writeInt32LE(0, 0);
                                packet.writeInt32LE(len, 4);
                                packet.write(str, 8, len);
                                return this.#socket.write(packet);
                            });
                        };
                    };

                    del() {
                        if (this.has()) {
                            if (typeof this.interval != "undefined") {
                                clearInterval(this.interval);
                                this.interval = undefined;
                            };
                            this.#socket.destroy();
                            this.emit("delete", !this.has());
                            this.#socket = undefined;
                            this.#status = "DELETED";
                        };
                    };

                    clr() {
                        this.clientId = packagejson.DISCORD_CLIENT_ID;
                        this.intervalTime = 15000;
                        this.pid = mainWindow.webContents.getOSProcessId();
                        this.state = undefined;
                        this.details = undefined;
                        this.startTimestamp = undefined;
                        this.endTimestamp = undefined;
                        this.elapsedTimestamp = true;
                        this.largeImage = undefined;
                        this.largeImageTooltip = undefined;
                        this.smallImage = undefined;
                        this.smallImageTooltip = undefined;
                        this.type = 3;
                        this.buttons = [];
                        this.instance = true;
                        this.emit("clear");
                    };
                };
                discordRichPresence.clr();
                const languages = [];
                for (const lang of readdirSync(resolve(join(__dirname, "translations"))).filter(file => file.endsWith(".json"))) {
                    languages.push(lang.split(extname(lang))[0].toLowerCase());
                };
                if (!settings.has(`${packagejson.exeName}.LANGUAGE`) || !languages.includes(String(settings.get(`${packagejson.exeName}.LANGUAGE`)).toLowerCase())) {
                    const locale = electron.app.getLocale().toLowerCase();
                    const systemLocale = electron.app.getSystemLocale().toLowerCase();
                    if (languages.includes(locale)) settings.set(`${packagejson.exeName}.LANGUAGE`, locale);
                    else if (languages.includes(systemLocale)) settings.set(`${packagejson.exeName}.LANGUAGE`, systemLocale);
                    else {
                        const findPreferred = electron.app.getPreferredSystemLanguages().find(lang => languages.includes(lang));
                        if (is.string(findPreferred)) settings.set(`${packagejson.exeName}.LANGUAGE`, findPreferred.toLowerCase());
                        else if (languages.length > 0 && is.string(languages[0])) settings.set(`${packagejson.exeName}.LANGUAGE`, languages[0]);
                    };
                };
                const translation = (() => {
                    try {
                        if (settings.has(`${packagejson.exeName}.LANGUAGE`) && is.string(settings.get(`${packagejson.exeName}.LANGUAGE`))) {
                            const value = require(resolve(join(__dirname, "translations", `${settings.get(`${packagejson.exeName}.LANGUAGE`)}.json`)));
                            return is.json(value) == true ? value : {};
                        } else return {};
                    } catch (error) {
                        return {};
                    };
                })();
                const getTranslation = key => {
                    if (is.string(key)) {
                        key = key.toUpperCase();
                        const value = key.split(".").reduce((accumulator, currentValue) => accumulator && accumulator[currentValue], translation);
                        return is.string(value) == true ? value : key;
                    } else return undefined;
                };
                const setAdBlock = async () => await electron.dialog.showMessageBox(mainWindow, {
                    title: displayName,
                    message: getTranslation("CONFIRM_ADBLOCK_DIALOG.MESSAGE"),
                    buttons: [getTranslation("CONFIRM_ADBLOCK_DIALOG.ALLOW"), getTranslation("CONFIRM_ADBLOCK_DIALOG.DISALLOW")],
                    defaultId: 1,
                    cancelId: 1,
                    noLink: true,
                    type: "warning"
                }).then(result => {
                    if (result.response == 0) settings.set(`${packagejson.exeName}.ADBLOCK`, true);
                    else settings.set(`${packagejson.exeName}.ADBLOCK`, false);
                });
                let errorCode = 500;
                const updateError = () => {
                    mainWindow.webContents.once("did-fail-load", (event, code) => sendError());
                    mainWindow.webContents.executeJavaScript(`(() => {const title = document.getElementById("title");const code = document.getElementById("code");const redirect = document.getElementById("redirect");const footer = document.getElementById("footer");if (title) title.innerText = "${getTranslation("ERROR.LABEL")}";if (code) code.innerText = "${String(getTranslation("ERROR.STATUS")).replace("#CODE#", errorCode)}";if (redirect) {redirect.href = "${defaultUrl.base}";redirect.innerText = "${getTranslation("ERROR.REDIRECT")}";}if (footer) footer.innerHTML = "${String(getTranslation("FOOTER")).replace("#COPYLEFT#", "<span style='display:inline-block;transform: rotate(180deg);vertical-align: middle;'>©</span>").replace("#TIME#", new Date().getFullYear().toString() == packagejson.releaseYear ? packagejson.releaseYear : `${packagejson.releaseYear} - ${new Date().getFullYear()}`).replace("#NEW_LINE#", "<br>").replace("#NAME#", `<a id='credits_name' href='${String(linkProject)}' draggable='false'>${String(displayName)} Desktop</a>`).replace("#CODED#", "&lt;/&gt;").replace("#HEART#", "❤").replace("#AUTHOR#", `<a id='credits_author' href='${String(author.url)}' draggable='false'>${String(author.name)}</a>`).replace("#CONTRIBUTORS_START#", `<a id='credits_contributors' href='${String(linkProject)}/graphs/contributors' draggable='false'>`).replace("#CONTRIBUTORS_END#", "</a>")}";})();`);
                    mainWindow.setTitle(String(getTranslation("TITLE.ERROR")).replace("#CODE#", errorCode));
                    discordRichPresence.clr();
                    discordRichPresence.details = getTranslation("ERROR.LABEL");
                    discordRichPresence.largeImage = "error";
                    discordRichPresence.largeImageTooltip = String(getTranslation("ERROR.STATUS")).replace("#CODE#", errorCode);
                    if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                };

                function sendError() {
                    mainWindow.loadFile(resolve(join(__dirname, "error.html"))).then(() => {
                        if (!is.number(errorCode)) errorCode = 500;
                        updateError();
                    });
                };
                electron.app.on("second-instance", (event, argv) => {
                    event.preventDefault();
                    const deepLink = deepLinkToUrl(argv.find(arg => is.deepUrl(arg) == true));
                    mainWindow.loadURL(deepLink).then(() => mainWindow.webContents.emit("will-navigate", undefined, deepLink));
                    if (isHidden) {
                        mainWindow.show();
                        if (!mainWindow.isAlwaysOnTop()) {
                            mainWindow.setAlwaysOnTop(true);
                            mainWindow.setAlwaysOnTop(false);
                        };
                    };
                });
                mainWindow.hookWindowMessage(0x0116, () => {
                    mainWindow.setEnabled(false);
                    mainWindow.setEnabled(true);
                });
                mainWindow.setMenuBarVisibility(false);
                mainWindow.webContents.setWindowOpenHandler(() => {
                    return {
                        action: "deny"
                    };
                });
                settings.onDidChange("START_UP", newValue => {
                    if (newValue) {
                        if (process.platform == "linux") writeFileSync(resolve(join(electron.app.getPath("appData"), "autostart", `${String(packagejson.name).replace("-", "_")}.desktop`)), `[Desktop Entry]\nType=Application\nName=${String(packagejson.displayName).replace("-", "_")}\nVersion=${electron.app.getVersion()}\nExec=${basename(electron.app.getPath("exe"))}\nIcon=${resolve(join(__dirname, "icon.ico")).replace("app.asar", "app.asar.unpacked")}\nComment=${packagejson.description}\nNoDisplay=false\nStartupNotify=false\nTerminal=false\nX-GNOME-Autostart-enabled=true`);
                        else electron.app.setLoginItemSettings({
                            openAtLogin: true,
                            enabled: true
                        });
                    } else {
                        if (process.platform == "linux") unlinkSync(resolve(join(electron.app.getPath("appData"), "autostart", `${String(packagejson.name).replace("-", "_")}.desktop`)));
                        else electron.app.setLoginItemSettings({
                            openAtLogin: false
                        });
                    };
                });
                settings.onDidChange("DISCORD_RICH_PRESENCE", newValue => {
                    if (newValue) mainWindow.webContents.emit("will-navigate", undefined, mainWindow.webContents.getURL());
                    else discordRichPresence.del();
                });
                settings.onDidChange("SAVE_WINDOW_SIZE", newValue => {
                    if (newValue) {
                        const size = mainWindow.getBounds();
                        settings.set(`${packagejson.exeName}.WIDTH`, size.width);
                        settings.set(`${packagejson.exeName}.HEIGHT`, size.height);
                    } else {
                        settings.delete("WIDTH");
                        settings.delete("HEIGHT");
                    };
                });
                settings.onDidChange("LANGUAGE", newValue => mainWindow.setAlwaysOnTop(newValue));
                settings.onDidChange("ALWAYS_ON_TOP", newValue => mainWindow.setAlwaysOnTop(newValue));
                settings.onDidChange("ADBLOCK", () => mainWindow.reload());
                electron.session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
                    if (settings.get(`${packagejson.exeName}.ADBLOCK`)) {
                        if (new URL(details.url).host.startsWith("pagead")) callback({
                            cancel: true
                        });
                        else callback({});
                    } else callback({});
                });
                mainWindow.on("resized", () => {
                    if (settings.get(`${packagejson.exeName}.SAVE_WINDOW_SIZE`)) {
                        const size = mainWindow.getBounds();
                        settings.set(`${packagejson.exeName}.WIDTH`, size.width);
                        settings.set(`${packagejson.exeName}.HEIGHT`, size.height);
                    };
                });
                mainWindow.on("page-title-updated", event => event.preventDefault());
                let notWatchEpisode = true;
                let notWatchScan = true;
                electron.ipcMain.on("deleteAllHistory", () => profile.set(historyProfile, {}));
                electron.ipcMain.on("deleteAllWatchlist", () => profile.set(watchlistProfile, {}));
                electron.ipcMain.on("deleteAllFavorite", () => profile.set(favoriteProfile, {}));
                electron.ipcMain.on("deleteHistory", (event, url) => {
                    if (is.url(url)) profile.delete(`${historyProfile}.${new URL(url).pathname}`);
                });
                electron.ipcMain.on("deleteWatchlist", (event, url) => {
                    if (is.url(url)) profile.delete(`${watchlistProfile}.${new URL(url).pathname}`);
                });
                electron.ipcMain.on("deleteFavorite", (event, url) => {
                    if (is.url(url)) profile.delete(`${favoriteProfile}.${new URL(url).pathname}`);
                });
                electron.ipcMain.on("episodeChange", (event, data) => {
                    let profileData = {};
                    const profileName = `${packagejson.exeName}.history.${data.url}`;
                    const profileValue = profile.get(profileName);
                    if (!is.json(profileValue)) {
                        if (is.string(data.type)) profileData.type = data.type == "MOVIE" ? "Film" : data.type;
                        if (is.string(data.title)) profileData.title = data.title;
                        if (is.string(data.image)) profileData.image = data.image;
                        if (is.string(data.language)) profileData.language = data.language;
                        if (is.string(data.episode)) profileData.episode = `Episode ${data.episode}`;
                        if (is.number(data.saved)) profileData.saved = data.saved;
                        profile.set(profileName, profileData);
                    } else {
                        if (is.string(data.episode)) profileData.episode = `Episode ${data.episode}`;
                        if (is.number(data.saved)) profileData.saved = data.saved;
                        profile.set(profileName, Object.assign(profileValue, profileData));
                    };
                    if (notWatchEpisode) {
                        notWatchEpisode = false;
                        discordRichPresence.clr();
                        if (data.type == "MOVIE") {
                            discordRichPresence.details = getTranslation(`ACTIVITY.WATCH.MOVIE.DETAILS`);
                            discordRichPresence.state = getTranslation(`ACTIVITY.WATCH.PAUSED`);
                            let title = String(getTranslation("TITLE.WATCH.MOVIE"));
                            if (is.string(data.title)) title = title.replace("#NAME#", data.title);
                            mainWindow.setTitle(title);
                        } else discordRichPresence.details = String(getTranslation(`ACTIVITY.WATCH.SERIE.DETAILS`)).replace("#STATUS#", getTranslation(`ACTIVITY.WATCH.PAUSED`));
                        if (is.string(data.image)) discordRichPresence.largeImage = data.image;
                        if (is.string(data.title)) discordRichPresence.largeImageTooltip = data.title;
                        mainWindow.webContents.on("media-started-playing", () => {
                            if (!notWatchEpisode) {
                                if (data.type == "MOVIE") discordRichPresence.state = getTranslation(`ACTIVITY.WATCH.PLAYING`);
                                else discordRichPresence.details = String(getTranslation(`ACTIVITY.WATCH.SERIE.DETAILS`)).replace("#STATUS#", getTranslation(`ACTIVITY.WATCH.PLAYING`));
                                if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                            };
                        });
                        mainWindow.webContents.on("media-paused", () => {
                            if (!notWatchEpisode) {
                                if (data.type == "MOVIE") discordRichPresence.state = getTranslation(`ACTIVITY.WATCH.PAUSED`);
                                else discordRichPresence.details = String(getTranslation(`ACTIVITY.WATCH.SERIE.DETAILS`)).replace("#STATUS#", getTranslation(`ACTIVITY.WATCH.PAUSED`));
                                if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                            };
                        });
                    };
                    discordRichPresence.buttons = [];
                    if (data.type != "MOVIE") {
                        const season = data.season.split("Saison")[1];
                        discordRichPresence.buttons.push({
                            label: getTranslation("ACTIVITY.WATCH.SERIE.BUTTON"),
                            url: `${defaultUrl.base}${data.url}`
                        });
                        if (is.string(season)) {
                            data.season = season.trim();
                            let title = String(getTranslation(`TITLE.WATCH.SERIE.SEASON`)).replace("#SEASON#", data.season);
                            if (is.string(data.episode)) title = title.replace("#EPISODE#", data.episode);
                            if (is.string(data.title)) title = title.replace("#NAME#", data.title);
                            mainWindow.setTitle(title);
                            let state = String(getTranslation(`ACTIVITY.WATCH.SERIE.STATE.SEASON`)).replace("#SEASON#", data.season);
                            if (is.string(data.episode)) state = state.replace("#EPISODE#", data.episode);
                            discordRichPresence.state = state;
                        } else {
                            let title = String(getTranslation(`TITLE.WATCH.SERIE.OTHER`)).replace("#SEASON#", data.season);
                            if (is.string(data.episode)) title = title.replace("#EPISODE#", data.episode);
                            if (is.string(data.title)) title = title.replace("#NAME#", data.title);
                            mainWindow.setTitle(title);
                            let state = String(getTranslation(`ACTIVITY.WATCH.SERIE.STATE.OTHER`)).replace("#SEASON#", data.season);
                            if (is.string(data.episode)) state = state.replace("#EPISODE#", data.episode);
                            discordRichPresence.state = state;
                        };
                    } else discordRichPresence.buttons.push({
                        label: getTranslation("ACTIVITY.WATCH.MOVIE.BUTTON"),
                        url: `${defaultUrl.base}${data.url}`
                    });
                    if (is.string(data.language)) {
                        discordRichPresence.smallImage = String(data.language).toLowerCase();
                        discordRichPresence.smallImageTooltip = getTranslation(`ACTIVITY.${String(data.language).toUpperCase()}`);
                    };
                    discordRichPresence.buttons.push({
                        label: getTranslation("ACTIVITY.INFO.BUTTON"),
                        url: `${defaultUrl.base}${data.urlInfo}`
                    });
                    if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                });
                electron.ipcMain.on("scanChange", (event, data) => {
                    let profileData = {};
                    const profileName = `${packagejson.exeName}.history.${data.url}`;
                    const profileValue = profile.get(profileName);
                    if (!is.json(profileValue)) {
                        if (is.string(data.type)) profileData.type = data.type == "SCAN" ? "Scans" : type;
                        if (is.string(data.title)) profileData.title = data.title;
                        if (is.string(data.image)) profileData.image = data.image;
                        if (is.string(data.language)) profileData.language = data.language;
                        if (is.string(data.chapter)) profileData.episode = `Chapitre ${data.chapter}`;
                        if (is.number(data.saved)) profileData.saved = data.saved;
                        profile.set(profileName, profileData);
                    } else {
                        if (is.string(data.chapter)) profileData.episode = `Chapitre ${data.chapter}`;
                        if (is.number(data.saved)) profileData.saved = data.saved;
                        profile.set(profileName, Object.assign(profileValue, profileData));
                    };
                    if (notWatchScan) {
                        notWatchScan = false;
                        discordRichPresence.clr();
                        discordRichPresence.details = getTranslation(`ACTIVITY.WATCH.SCAN.DETAILS`);
                        if (is.string(data.image)) discordRichPresence.largeImage = data.image;
                        if (is.string(data.title)) discordRichPresence.largeImageTooltip = data.title;
                        discordRichPresence.buttons.push({
                            label: getTranslation(`ACTIVITY.WATCH.SCAN.BUTTON`),
                            url: `${defaultUrl.base}${data.url}`
                        });
                        discordRichPresence.buttons.push({
                            label: getTranslation("ACTIVITY.INFO.BUTTON"),
                            url: `${defaultUrl.base}${data.urlInfo}`
                        });
                    };
                    let title = String(getTranslation(`TITLE.WATCH.SCAN`));
                    if (is.string(data.chapter)) title = title.replace("#CHAPTER#", data.chapter);
                    if (is.string(data.title)) title = title.replace("#NAME#", data.title);
                    mainWindow.setTitle(title);
                    let state = String(getTranslation(`ACTIVITY.WATCH.SCAN.STATE`));
                    if (is.string(data.chapter)) state = state.replace("#CHAPTER#", data.chapter);
                    discordRichPresence.state = state;
                    if (is.string(data.language)) {
                        discordRichPresence.smallImage = String(data.language).toLowerCase();
                        discordRichPresence.smallImageTooltip = getTranslation(`ACTIVITY.${String(data.language).toUpperCase()}`);
                    };
                    if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                });
                electron.ipcMain.on("watchlistChange", (event, data) => {
                    let profileData = {};
                    const profileName = `${packagejson.exeName}.watchlist.${data.url}`;
                    if (!is.json(profile.get(profileName))) {
                        if (is.string(data.title)) profileData.title = data.title;
                        if (is.string(data.image)) profileData.image = data.image;
                        profile.set(profileName, profileData);
                    } else profile.delete(profileName);
                });
                electron.ipcMain.on("favoriteChange", (event, data) => {
                    let profileData = {};
                    const profileName = `${packagejson.exeName}.favorite.${data.url}`;
                    if (!is.json(profile.get(profileName))) {
                        if (is.string(data.title)) profileData.title = data.title;
                        if (is.string(data.image)) profileData.image = data.image;
                        profile.set(profileName, profileData);
                    } else profile.delete(profileName);
                });
                mainWindow.webContents.on("will-navigate", (event, url) => {
                    const validateUrl = new URL(url);
                    const pathName = validateUrl.pathname.endsWith("/") ? validateUrl.pathname.slice(0, validateUrl.pathname.lastIndexOf("/")) : validateUrl.pathname;
                    if (validateUrl.host == new URL(defaultUrl.base).host) {
                        if (!pathName.startsWith("/catalogue/")) {
                            discordRichPresence.clr();
                            notWatchEpisode = true;
                            notWatchScan = true;
                            mainWindow.webContents.removeAllListeners("media-started-playing");
                            mainWindow.webContents.removeAllListeners("media-paused");
                        } else {
                            let pathName = validateUrl.pathname.endsWith("/") ? validateUrl.pathname.slice(0, validateUrl.pathname.lastIndexOf("/")) : validateUrl.pathname;
                            pathName = pathName.split("/catalogue/")[1];
                            if (!pathName.includes("/")) mainWindow.once("page-title-updated", (event, originalTitle) => {
                                event.preventDefault();
                                discordRichPresence.clr();
                                notWatchEpisode = true;
                                notWatchScan = true;
                                mainWindow.webContents.removeAllListeners("media-started-playing");
                                mainWindow.webContents.removeAllListeners("media-paused");
                                const fetchedTitle = originalTitle.split("|")[0].trim();
                                let title = getTranslation("TITLE.INFO");
                                if (is.string(fetchedTitle)) title = title.replace("#NAME#", fetchedTitle);
                                mainWindow.setTitle(title);
                                discordRichPresence.details = getTranslation(`ACTIVITY.INFO.DETAILS`);
                                discordRichPresence.largeImage = `https://cdn.statically.io/gh/Anime-Sama/IMG/img/contenu/${validateUrl.pathname.endsWith(`/`) ? validateUrl.pathname.slice(0, validateUrl.pathname.lastIndexOf(`/`)).split("/").pop() : validateUrl.pathname.split("/").pop()}.jpg`;
                                if (is.string(fetchedTitle)) discordRichPresence.largeImageTooltip = fetchedTitle;
                                discordRichPresence.buttons.push({
                                    label: getTranslation(`ACTIVITY.INFO.BUTTON`),
                                    url: url
                                });
                                if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                            });
                        };
                        if (pathName.length <= 0) {
                            mainWindow.setTitle(getTranslation("TITLE.HOME"));
                            discordRichPresence.details = getTranslation("ACTIVITY.HOME.DETAILS");
                            discordRichPresence.largeImage = "logo";
                            discordRichPresence.buttons.push({
                                label: getTranslation("ACTIVITY.HOME.BUTTON"),
                                url: url
                            });
                            if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                        } else if (pathName == "/catalogue") {
                            mainWindow.setTitle(getTranslation("TITLE.CATALOG"));
                            discordRichPresence.details = getTranslation("ACTIVITY.CATALOG.DETAILS");
                            discordRichPresence.largeImage = "catalog";
                            discordRichPresence.buttons.push({
                                label: getTranslation("ACTIVITY.CATALOG.BUTTON"),
                                url: url
                            });
                            if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                        } else if (pathName == "/planning") {
                            mainWindow.setTitle(getTranslation("TITLE.PLANNING"));
                            discordRichPresence.details = getTranslation("ACTIVITY.PLANNING.DETAILS");
                            discordRichPresence.largeImage = "planning";
                            discordRichPresence.buttons.push({
                                label: getTranslation("ACTIVITY.PLANNING.BUTTON"),
                                url: url
                            });
                            if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                        } else if (pathName == "/aide") {
                            mainWindow.setTitle(getTranslation("TITLE.HELP"));
                            discordRichPresence.details = getTranslation("ACTIVITY.HELP.DETAILS");
                            discordRichPresence.largeImage = "help";
                            discordRichPresence.buttons.push({
                                label: getTranslation("ACTIVITY.HELP.BUTTON"),
                                url: url
                            });
                            if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                        } else if (pathName == "/profil") {
                            mainWindow.setTitle(getTranslation("TITLE.PROFILE"));
                            discordRichPresence.details = getTranslation("ACTIVITY.PROFILE.DETAILS");
                            discordRichPresence.largeImage = "profile";
                            discordRichPresence.buttons.push({
                                label: getTranslation("ACTIVITY.PROFILE.BUTTON"),
                                url: url
                            });
                            if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                        } else if (pathName == "/contact") {
                            mainWindow.setTitle(getTranslation("TITLE.CONTACT"));
                            discordRichPresence.details = getTranslation("ACTIVITY.CONTACT.DETAILS");
                            discordRichPresence.largeImage = "contact";
                            discordRichPresence.buttons.push({
                                label: getTranslation("ACTIVITY.CONTACT.BUTTON"),
                                url: url
                            });
                            if (settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`)) discordRichPresence.set();
                        };
                    } else if (validateUrl.protocol != "file:" || !url.endsWith("error.html")) {
                        event.preventDefault();
                        electron.shell.openExternal(url);
                    };
                });

                function init(url) {
                    splashWindow.removeAllListeners("closed");
                    if (!splashWindow.isDestroyed()) {
                        splashWindow.once("closed", () => init(url));
                        return splashWindow.close();
                    } else {
                        const isUrl = is.url(url);
                        if (settings.get(`${packagejson.exeName}.ALWAYS_ON_TOP`)) mainWindow.setAlwaysOnTop(true);
                        if (isUrl) mainWindow.webContents.emit("will-navigate", undefined, url);
                        const tray = new electron.Tray(icon);
                        mainWindow.on("close", event => {
                            if (settings.get(`${packagejson.exeName}.MINIMIZE_TO_TRAY`)) {
                                event.preventDefault();
                                if (!isHidden) mainWindow.hide();
                                return false;
                            } else {
                                if (!tray.isDestroyed()) tray.destroy();
                                return true;
                            };
                        });
                        const trayMenu = electron.Menu.buildFromTemplate([{
                            id: "title",
                            enabled: false,
                            label: displayName,
                            icon: electron.nativeImage.createFromPath(icon).resize({
                                width: 16
                            })
                        }, {
                            type: "separator"
                        }, {
                            id: "import",
                            label: getTranslation("TRAY.IMPORT"),
                            submenu: [{
                                id: "profileImport",
                                label: getTranslation("TRAY.PROFILE"),
                                click: async () => await electron.dialog.showOpenDialog(mainWindow, {
                                    defaultPath: profile.path,
                                    filters: [{
                                        name: "JSON",
                                        extensions: ["json"]
                                    }],
                                    properties: ["openFile"]
                                }).then(result => {
                                    if (!result.canceled && is.string(result.filePaths[0])) {
                                        if (new URL(mainWindow.webContents.getURL()).host == new URL(defaultUrl.base).host) {
                                            const importedProfile = require(result.filePaths[0]);
                                            if (is.json(importedProfile)) {
                                                const all = importedProfile[packagejson.exeName];
                                                if (is.json(all)) {
                                                    const history = all["history"];
                                                    const watchlist = all["watchlist"];
                                                    const favorite = all["favorite"];
                                                    if (is.json(history)) {
                                                        for (const [key, value] of Object.entries(history).filter(([key, value]) => is.json(value) == true)) {
                                                            mainWindow.webContents.send("importHistory", `${defaultUrl.base}${key}`, value["type"], value["title"], value["image"], value["language"], value["episode"], value["saved"]);
                                                        };
                                                        profile.set(historyProfile, Object.assign(profile.get(historyProfile), history));
                                                    };
                                                    if (is.json(watchlist)) {
                                                        for (const [key, value] of Object.entries(watchlist).filter(([key, value]) => is.json(value) == true)) {
                                                            mainWindow.webContents.send("importWatchlist", `${defaultUrl.base}${key}`, value["title"], value["image"]);
                                                        };
                                                        profile.set(watchlistProfile, Object.assign(profile.get(watchlistProfile), watchlist));
                                                    };
                                                    if (is.json(favorite)) {
                                                        for (const [key, value] of Object.entries(favorite).filter(([key, value]) => is.json(value) == true)) {
                                                            mainWindow.webContents.send("importFavorite", `${defaultUrl.base}${key}`, value["title"], value["image"]);
                                                        };
                                                        profile.set(favoriteProfile, Object.assign(profile.get(favoriteProfile), favorite));
                                                    };
                                                    mainWindow.webContents.reload();
                                                };
                                            };
                                        };
                                    };
                                })
                            }, {
                                id: "settingsImport",
                                label: getTranslation("TRAY.SETTINGS.LABEL"),
                                click: async () => await electron.dialog.showOpenDialog(mainWindow, {
                                    defaultPath: settings.path,
                                    filters: [{
                                        name: "JSON",
                                        extensions: ["json"]
                                    }],
                                    properties: ["openFile"]
                                }).then(async result => {
                                    if (!result.canceled && is.string(result.filePaths[0])) {
                                        const importedSettings = require(result.filePaths[0]);
                                        if (is.json(importedSettings)) {
                                            if (is.json(importedSettings[packagejson.exeName])) {
                                                let restartLanguage = [false];
                                                for (let [name, value] of Object.entries(importedSettings[packagejson.exeName])) {
                                                    name = name.toUpperCase();
                                                    if (name == "LANGUAGE" && is.string(value) && settings.get(`${packagejson.exeName}.${name}`) != value) restartLanguage = [true, value];
                                                    else if (name == "WIDTH" && is.number(value) && value <= size.width && settings.get(`${packagejson.exeName}.WIDTH`) != value) {
                                                        settings.set(`${packagejson.exeName}.WIDTH`, value);
                                                        mainWindow.setSize(value, settings.get(`${packagejson.exeName}.HEIGHT`));
                                                        mainWindow.center();
                                                    } else if (name == "HEIGHT" && is.number(value) && value <= size.height && settings.get(`${packagejson.exeName}.HEIGHT`) != value) {
                                                        settings.set(`${packagejson.exeName}.HEIGHT`, value);
                                                        mainWindow.setSize(settings.get(`${packagejson.exeName}.WIDTH`), value);
                                                        mainWindow.center();
                                                    } else if (typeof value == "boolean" && settings.get(`${packagejson.exeName}.${name}`) != value) {
                                                        if (name == "ADBLOCK") await setAdBlock();
                                                        else settings.set(`${packagejson.exeName}.${name}`, value);
                                                    };
                                                };
                                                if (restartLanguage[0]) return await electron.dialog.showMessageBox(mainWindow, {
                                                    title: displayName,
                                                    message: getTranslation("CONFIRM_LANGUAGE_DIALOG.MESSAGE"),
                                                    buttons: [getTranslation("CONFIRM_LANGUAGE_DIALOG.ALLOW"), getTranslation("CONFIRM_LANGUAGE_DIALOG.DISALLOW")],
                                                    defaultId: 1,
                                                    cancelId: 1,
                                                    noLink: true,
                                                    type: "warning"
                                                }).then(result => {
                                                    if (result.response == 0) {
                                                        settings.set(`${packagejson.exeName}.LANGUAGE`, restartLanguage[1]);
                                                        electron.app.relaunch();
                                                        mainWindow.removeAllListeners("close");
                                                        if (!tray.isDestroyed()) tray.destroy();
                                                        return electron.app.quit();
                                                    };
                                                });
                                            };
                                        };
                                    };
                                })
                            }]
                        }, {
                            id: "export",
                            label: getTranslation("TRAY.EXPORT"),
                            submenu: [{
                                id: "profileExport",
                                label: getTranslation("TRAY.PROFILE"),
                                click: async () => await electron.dialog.showSaveDialog(mainWindow, {
                                    defaultPath: resolve(join(electron.app.getPath("home"), "profile.json"))
                                }).then(result => {
                                    if (is.string(result.filePath)) writeFileSync(result.filePath, JSON.stringify(profile.store))
                                })
                            }, {
                                id: "settingsExport",
                                label: getTranslation("TRAY.SETTINGS.LABEL"),
                                click: async () => await electron.dialog.showSaveDialog(mainWindow, {
                                    defaultPath: resolve(join(electron.app.getPath("home"), "settings.json"))
                                }).then(result => {
                                    if (is.string(result.filePath)) writeFileSync(result.filePath, JSON.stringify(settings.store));
                                })
                            }]
                        }, {
                            type: "separator"
                        }, {
                            id: "actions",
                            label: getTranslation("TRAY.ACTIONS.LABEL"),
                            submenu: [{
                                id: "back",
                                label: getTranslation("TRAY.ACTIONS.BACK"),
                                enabled: mainWindow.webContents.canGoBack(),
                                click: () => {
                                    mainWindow.webContents.once("did-navigate", (event, url) => mainWindow.webContents.emit("will-navigate", undefined, url));
                                    mainWindow.webContents.goBack();
                                }
                            }, {
                                id: "forward",
                                label: getTranslation("TRAY.ACTIONS.FORWARD"),
                                enabled: mainWindow.webContents.canGoForward(),
                                click: () => {
                                    mainWindow.webContents.once("did-navigate", (event, url) => mainWindow.webContents.emit("will-navigate", undefined, url));
                                    mainWindow.webContents.goForward();
                                }
                            }, {
                                id: "restore",
                                label: getTranslation("TRAY.ACTIONS.RESTORE"),
                                click: () => mainWindow.show()
                            }, {
                                id: "reduce",
                                label: getTranslation("TRAY.ACTIONS.REDUCE"),
                                click: () => mainWindow.hide()
                            }, {
                                id: "refresh",
                                label: getTranslation("TRAY.ACTIONS.REFRESH"),
                                click: () => mainWindow.reload()
                            }, {
                                id: "forceRefresh",
                                label: getTranslation("TRAY.ACTIONS.FORCE_REFRESH"),
                                click: () => mainWindow.webContents.reloadIgnoringCache()
                            }, {
                                id: "center",
                                label: getTranslation("TRAY.ACTIONS.CENTER"),
                                click: () => mainWindow.center()
                            }]
                        }, {
                            id: "settings",
                            label: getTranslation("TRAY.SETTINGS.LABEL"),
                            submenu: [{
                                id: "languages",
                                label: getTranslation("TRAY.SETTINGS.LANGUAGES"),
                                submenu: []
                            }, {
                                id: "start_up",
                                label: getTranslation("TRAY.SETTINGS.START_UP"),
                                type: "checkbox",
                                checked: settings.get(`${packagejson.exeName}.START_UP`) == true,
                                click: () => settings.set(`${packagejson.exeName}.START_UP`, !settings.get(`${packagejson.exeName}.START_UP`))
                            }, {
                                id: "start_hidden",
                                label: getTranslation("TRAY.SETTINGS.START_HIDDEN"),
                                type: "checkbox",
                                checked: settings.get(`${packagejson.exeName}.START_FULL_SCREEN`) == true ? false : settings.get(`${packagejson.exeName}.START_HIDDEN`) == true,
                                click: () => settings.set(`${packagejson.exeName}.START_HIDDEN`, !settings.get(`${packagejson.exeName}.START_HIDDEN`))
                            }, {
                                id: "start_full_screen",
                                label: getTranslation("TRAY.SETTINGS.START_FULL_SCREEN"),
                                type: "checkbox",
                                checked: settings.get(`${packagejson.exeName}.START_HIDDEN`) == true ? false : settings.get(`${packagejson.exeName}.START_FULL_SCREEN`) == true,
                                click: () => settings.set(`${packagejson.exeName}.START_FULL_SCREEN`, !settings.get(`${packagejson.exeName}.START_FULL_SCREEN`))
                            }, {
                                id: "minimize_to_tray",
                                label: getTranslation("TRAY.SETTINGS.MINIMIZE_TO_TRAY"),
                                type: "checkbox",
                                checked: settings.get(`${packagejson.exeName}.MINIMIZE_TO_TRAY`) == true,
                                click: () => settings.set(`${packagejson.exeName}.MINIMIZE_TO_TRAY`, !settings.get(`${packagejson.exeName}.MINIMIZE_TO_TRAY`))
                            }, {
                                id: "save_window_size",
                                label: getTranslation("TRAY.SETTINGS.SAVE_WINDOW_SIZE"),
                                type: "checkbox",
                                enabled: process.platform != "linux",
                                checked: settings.get(`${packagejson.exeName}.SAVE_WINDOW_SIZE`) == true,
                                click: () => settings.set(`${packagejson.exeName}.SAVE_WINDOW_SIZE`, !settings.get(`${packagejson.exeName}.SAVE_WINDOW_SIZE`))
                            }, {
                                id: "always_on_top",
                                label: getTranslation("TRAY.SETTINGS.ALWAYS_ON_TOP"),
                                type: "checkbox",
                                checked: settings.get(`${packagejson.exeName}.ALWAYS_ON_TOP`) == true,
                                click: () => settings.set(`${packagejson.exeName}.ALWAYS_ON_TOP`, !settings.get(`${packagejson.exeName}.ALWAYS_ON_TOP`))
                            }, {
                                id: "adblock",
                                label: getTranslation("TRAY.SETTINGS.ADBLOCK"),
                                type: "checkbox",
                                checked: settings.get(`${packagejson.exeName}.ADBLOCK`) == true,
                                click: async () => await setAdBlock()
                            }, {
                                id: "discord_rich_presence",
                                label: getTranslation("TRAY.SETTINGS.DISCORD_RICH_PRESENCE"),
                                type: "checkbox",
                                checked: settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`) == true,
                                click: () => settings.set(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`, !settings.get(`${packagejson.exeName}.DISCORD_RICH_PRESENCE`))
                            }]
                        }, {
                            id: "advanced",
                            label: getTranslation("TRAY.ADVANCED.LABEL"),
                            submenu: [{
                                id: "reload",
                                label: getTranslation("TRAY.ADVANCED.RELOAD"),
                                click: () => mainWindow.loadURL(defaultUrl.base).then(() => mainWindow.webContents.emit("will-navigate", undefined, defaultUrl.base)).catch((event, code) => {
                                    errorCode = code;
                                    sendError();
                                })
                            }, {
                                id: "restart",
                                label: getTranslation("TRAY.ADVANCED.RESTART"),
                                click: async () => await electron.dialog.showMessageBox(mainWindow, {
                                    title: displayName,
                                    message: getTranslation("RESTART_DIALOG.MESSAGE"),
                                    buttons: [getTranslation("RESTART_DIALOG.ALLOW"), getTranslation("RESTART_DIALOG.DISALLOW")],
                                    defaultId: 1,
                                    cancelId: 1,
                                    noLink: true,
                                    type: "warning"
                                }).then(result => {
                                    if (result.response == 0) {
                                        electron.app.relaunch();
                                        mainWindow.removeAllListeners("close");
                                        if (!tray.isDestroyed()) tray.destroy();
                                        return electron.app.quit();
                                    };
                                })
                            }, {
                                id: "resetData",
                                label: getTranslation("TRAY.ADVANCED.RESET_DATA"),
                                click: async () => await electron.dialog.showMessageBox(mainWindow, {
                                    title: displayName,
                                    message: getTranslation("CHANGE_RESTART_DIALOG.MESSAGE"),
                                    buttons: [getTranslation("CHANGE_RESTART_DIALOG.ALLOW"), getTranslation("CHANGE_RESTART_DIALOG.DISALLOW")],
                                    defaultId: 1,
                                    cancelId: 1,
                                    noLink: true,
                                    type: "warning"
                                }).then(async result => {
                                    if (result.response == 0) {
                                        const defaultSession = electron.session.defaultSession;
                                        settings.clear();
                                        profile.clear();
                                        await defaultSession.clearAuthCache();
                                        await defaultSession.clearHostResolverCache();
                                        await defaultSession.clearStorageData();
                                        await defaultSession.clearCache();
                                        electron.app.relaunch();
                                        mainWindow.removeAllListeners("close");
                                        if (!tray.isDestroyed()) tray.destroy();
                                        return electron.app.quit();
                                    };
                                })
                            }, {
                                id: "forceClose",
                                label: getTranslation("TRAY.ADVANCED.FORCE_CLOSE"),
                                click: () => electron.app.exit()
                            }]
                        }, {
                            type: "separator"
                        }, {
                            id: "close",
                            label: getTranslation("TRAY.CLOSE"),
                            click: () => {
                                mainWindow.removeAllListeners("close");
                                if (!tray.isDestroyed()) tray.destroy();
                                return electron.app.quit();
                            }
                        }]);
                        const profileImport = trayMenu.getMenuItemById("profileImport");
                        const profileExport = trayMenu.getMenuItemById("profileExport");
                        const languagesTray = trayMenu.getMenuItemById("languages");
                        const startHidden = trayMenu.getMenuItemById("start_hidden");
                        const startFullScreen = trayMenu.getMenuItemById("start_full_screen");
                        const back = trayMenu.getMenuItemById("back");
                        const forward = trayMenu.getMenuItemById("forward");
                        const restore = trayMenu.getMenuItemById("restore");
                        const reduce = trayMenu.getMenuItemById("reduce");
                        const getAnotherTranslation = (key, lang) => {
                            if (is.string(lang) && is.string(key)) {
                                key = key.toUpperCase();
                                const value = key.split(".").reduce((accumulator, currentValue) => accumulator && accumulator[currentValue], (() => {
                                    try {
                                        const value = require(resolve(join(__dirname, "translations", `${lang}.json`)));
                                        return is.json(value) == true ? value : {};
                                    } catch (error) {
                                        return {};
                                    };
                                })());
                                return is.string(value) == true ? value : `${lang}.${key}`;
                            } else return undefined;
                        };
                        for (const lang of languages) {
                            languagesTray.submenu.append(new electron.MenuItem({
                                id: lang,
                                type: "checkbox",
                                label: lang == settings.get(`${packagejson.exeName}.LANGUAGE`) ? getTranslation("LANGUAGE") : getAnotherTranslation("LANGUAGE", lang),
                                icon: resolve(join(__dirname, "translations", `${lang}.png`)),
                                checked: lang == settings.get(`${packagejson.exeName}.LANGUAGE`),
                                click: async () => await electron.dialog.showMessageBox(mainWindow, {
                                    title: displayName,
                                    message: getTranslation("CONFIRM_LANGUAGE_DIALOG.MESSAGE"),
                                    buttons: [getTranslation("CONFIRM_LANGUAGE_DIALOG.ALLOW"), getTranslation("CONFIRM_LANGUAGE_DIALOG.DISALLOW")],
                                    defaultId: 1,
                                    cancelId: 1,
                                    noLink: true,
                                    type: "warning"
                                }).then(result => {
                                    if (result.response == 0) {
                                        settings.set(`${packagejson.exeName}.LANGUAGE`, lang);
                                        electron.app.relaunch();
                                        mainWindow.removeAllListeners("close");
                                        if (!tray.isDestroyed()) tray.destroy();
                                        return electron.app.quit();
                                    };
                                })
                            }));
                        };
                        if (!electron.globalShortcut.isRegistered("CommandOrControl+Shift+Z")) electron.globalShortcut.register("CommandOrControl+Shift+Z", () => {
                            if (back && mainWindow.isFocused()) back.click();
                        });
                        if (!electron.globalShortcut.isRegistered("CommandOrControl+Shift+Y")) electron.globalShortcut.register("CommandOrControl+Shift+Y", () => {
                            if (forward && mainWindow.isFocused()) forward.click();
                        });
                        if (startHidden && startFullScreen) {
                            settings.onDidChange("START_HIDDEN", newValue => {
                                if (newValue) {
                                    startHidden.checked = true;
                                    settings.set(`${packagejson.exeName}.START_FULL_SCREEN`, false);
                                } else startHidden.checked = false;
                            });
                            settings.onDidChange("START_FULL_SCREEN", newValue => {
                                if (newValue) {
                                    startFullScreen.checked = true;
                                    settings.set(`${packagejson.exeName}.START_HIDDEN`, false);
                                } else startFullScreen.checked = false;
                            });
                        };
                        if (restore && reduce) {
                            if (isHidden) {
                                restore.enabled = true;
                                reduce.enabled = false;
                            } else {
                                restore.enabled = false;
                                reduce.enabled = true;
                            };
                        };
                        for (const event of ["show", "restore"]) {
                            mainWindow.on(event, () => {
                                isHidden = false;
                                if (restore && reduce) {
                                    restore.enabled = false;
                                    reduce.enabled = true;
                                };
                            });
                        };
                        for (const event of ["hide", "minimize"]) {
                            mainWindow.on(event, () => {
                                isHidden = true;
                                if (restore && reduce) {
                                    restore.enabled = true;
                                    reduce.enabled = false;
                                };
                            });
                        };
                        for (const [traySetting, settingName] of [
                                [trayMenu.getMenuItemById("start_up"), "START_UP"],
                                [trayMenu.getMenuItemById("minimize_to_tray"), "MINIMIZE_TO_TRAY"],
                                [trayMenu.getMenuItemById("save_window_size"), "SAVE_WINDOW_SIZE"],
                                [trayMenu.getMenuItemById("always_on_top"), "ALWAYS_ON_TOP"],
                                [trayMenu.getMenuItemById("discord_rich_presence"), "DISCORD_RICH_PRESENCE"]
                            ]) {
                            if (traySetting) settings.onDidChange(`${packagejson.exeName}.${settingName}`, newValue => traySetting.checked = newValue);
                        };
                        tray.on("double-click", () => {
                            if (isHidden) {
                                mainWindow.show();
                                if (!mainWindow.isAlwaysOnTop()) {
                                    mainWindow.setAlwaysOnTop(true);
                                    mainWindow.setAlwaysOnTop(false);
                                };
                            } else return mainWindow.hide();
                        });
                        tray.setToolTip(displayName);
                        tray.setContextMenu(trayMenu);
                        const udpateStyle = () => {
                            mainWindow.webContents.insertCSS("::-webkit-scrollbar {display: none;}div ::-webkit-scrollbar {display: block;}.mt-auto p a {color: #808080;text-decoration: none;transition-property: all;transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);transition-duration: 200ms;}.mt-auto p a:hover {color: #0EA5E9;}footer span a {color: #808080;text-decoration: none;transition-property: all;transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);transition-duration: 200ms;}footer span a:hover {color: #0EA5E9;}");
                            mainWindow.webContents.executeJavaScript(`document.querySelectorAll("a").forEach(item => {item.removeAttribute("target");item.setAttribute("draggable", "false");});let replaceNavFooter = document.querySelector(".mt-auto p");if (replaceNavFooter) {replaceNavFooter.className = "font-semibold";replaceNavFooter.style.cssText = "color: white;text-align: center;";replaceNavFooter.innerHTML = "${String(getTranslation("FOOTER")).replace("#COPYLEFT#", "<span style='display:inline-block;transform: rotate(180deg);vertical-align: middle;'>©</span>").replace("#TIME#", new Date().getFullYear().toString() == packagejson.releaseYear ? packagejson.releaseYear : `${packagejson.releaseYear} - ${new Date().getFullYear()}`).replace("#NEW_LINE#", "<br>").replace("#NAME#", `<a id='credits_name' href='${String(linkProject)}' draggable='false'>${String(displayName)} Desktop</a>`).replace("#CODED#", "&lt;/&gt;").replace("#HEART#", "❤").replace("#AUTHOR#", `<a id='credits_author' href='${String(author.url)}' draggable='false'>${String(author.name)}</a>`).replace("#CONTRIBUTORS_START#", `<a id='credits_contributors' href='${String(linkProject)}/graphs/contributors' draggable='false'>`).replace("#CONTRIBUTORS_END#", "</a>")}";};const replaceFooter = document.querySelector("footer span");if (replaceFooter) {replaceFooter.className = "font-semibold";replaceFooter.style.cssText = "color: white;text-align: center;";replaceFooter.innerHTML = "${String(getTranslation("FOOTER")).replace("#COPYLEFT#", "<span style='display:inline-block;transform: rotate(180deg);vertical-align: middle;'>©</span>").replace("#TIME#", new Date().getFullYear().toString() == packagejson.releaseYear ? packagejson.releaseYear : `${packagejson.releaseYear} - ${new Date().getFullYear()}`).replace("#NEW_LINE#", "<br>").replace("#NAME#", `<a id='credits_name' href='${String(linkProject)}' draggable='false'>${String(displayName)} Desktop</a>`).replace("#CODED#", "&lt;/&gt;").replace("#HEART#", "❤").replace("#AUTHOR#", `<a id='credits_author' href='${String(author.url)}' draggable='false'>${String(author.name)}</a>`).replace("#CONTRIBUTORS_START#", `<a id='credits_contributors' href='${String(linkProject)}/graphs/contributors' draggable='false'>`).replace("#CONTRIBUTORS_END#", "</a>")}";};`);
                        };
                        udpateStyle();
                        mainWindow.webContents.on("did-navigate", (event, url, httpResponseCode) => {
                            const validateUrl = new URL(url);
                            if (back) back.enabled = mainWindow.webContents.canGoBack();
                            if (forward) forward.enabled = mainWindow.webContents.canGoForward();
                            if (httpResponseCode != 200) {
                                errorCode = httpResponseCode;
                                event.preventDefault();
                                sendError();
                            } else if (validateUrl.protocol == "file:" && url.endsWith("error.html")) updateError();
                            else if (validateUrl.host == new URL(defaultUrl.base).host) {
                                if (profileImport) profileImport.enabled = true;
                                if (profileExport) profileExport.enabled = true;
                                udpateStyle();
                                const pathName = validateUrl.pathname.endsWith("/") ? validateUrl.pathname.slice(0, validateUrl.pathname.lastIndexOf("/")) : validateUrl.pathname;
                                if (pathName == "/catalogue") mainWindow.webContents.executeJavaScript("document.querySelectorAll(\".form-checkbox\").forEach(element => {if (element.checked) genresChecked.push(element.value);else genresChecked.remove(element.value);});if (genresChecked.length > 0) {$('#nav_pages').hide();$.ajax({url:\"listing_all.php\",method:\"post\",data:{query:undefined},success:function(data){$('#result_catalogue').html(data);const buttonFilter = document.getElementById(\"btnTriList\")if (buttonFilter) buttonFilter.click();}});};");
                            } else {
                                if (profileImport) profileImport.enabled = false;
                                if (profileExport) profileExport.enabled = false;
                            };
                        });
                        if (!isHidden) {
                            mainWindow.show();
                            if (!mainWindow.isAlwaysOnTop()) {
                                mainWindow.setAlwaysOnTop(true);
                                mainWindow.setAlwaysOnTop(false);
                            };
                        };
                    };
                };
                return mainWindow.loadURL(defaultUrl.full).then(() => init(defaultUrl.full)).catch((event, code) => {
                    errorCode = code;
                    init();
                    return sendError();
                });
            };
            electron.app.on("activate", () => {
                if (electron.BrowserWindow.getAllWindows().length <= 0) return createWindow();
            });
            return createWindow();
        });
    });
} else return electron.app.quit();