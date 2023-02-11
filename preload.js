const {
    ipcRenderer
} = require("electron");
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

    url(value) {
        try {
            new URL(value);
            return true;
        } catch (error) {
            return false;
        };
    };
};
const storage = new class {
    has(name) {
        if (is.string(name)) {
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key == name) return true;
            };
            return false;
        } else return false;
    };

    get(name) {
        let value = undefined;
        try {
            if (this.has(name)) {
                value = window.localStorage.getItem(name);
                return JSON.parse(value);
            } else return value;
        } catch (error) {
            return value;
        };
    };

    set(name, value) {
        if (is.string(name)) {
            if (typeof value != "string") value = JSON.stringify(value);
            window.localStorage.setItem(name, value);
            return true;
        } else return false;
    };
};
window.addEventListener("DOMContentLoaded", () => {
    const currentPathName = window.location.pathname.endsWith("/") ? window.location.pathname.slice(0, window.location.pathname.lastIndexOf("/")) : window.location.pathname;
    if (currentPathName.length <= 0 || currentPathName == "/profil") document.querySelectorAll(".supprHistorique").forEach(element => element.addEventListener("click", event => ipcRenderer.send("deleteHistory", event.currentTarget.nextSibling.href)));
    if (currentPathName == "/profil") {
        const supprAllHistorique = document.getElementById("supprAllHistorique");
        const supprAllWatchlist = document.getElementById("supprAllWatchlist");
        const supprAllFavoris = document.getElementById("supprAllFavoris");
        if (supprAllHistorique) supprAllHistorique.addEventListener("click", () => ipcRenderer.send("deleteAllHistory"));
        if (supprAllWatchlist) supprAllWatchlist.addEventListener("click", () => ipcRenderer.send("deleteAllWatchlist"));
        if (supprAllFavoris) supprAllFavoris.addEventListener("click", () => ipcRenderer.send("deleteAllFavorite"));
        document.querySelectorAll(".supprWatchlist").forEach(element => element.addEventListener("click", event => ipcRenderer.send("deleteWatchlist", event.currentTarget.nextSibling.href)));
        document.querySelectorAll(".supprFavoris").forEach(element => element.addEventListener("click", event => ipcRenderer.send("deleteFavorite", event.currentTarget.nextSibling.href)));
    } else if (currentPathName.startsWith("/catalogue/")) {
        const episode = document.getElementById("savedEpisodeId");
        const scan = document.getElementById("savedChapitreId");
        const watchlist = document.getElementById("addWatchlist");
        const favorite = document.getElementById("addFavoris");
        const getHistoData = () => {
            let data = {};
            let index = storage.get("histoUrl");
            index = is.array(index) == true ? index.findIndex(pathname => is.string(pathname) == true && (pathname.endsWith("/") ? pathname.slice(0, pathname.lastIndexOf("/")) : pathname) == currentPathName) : -1;
            if (index >= 0) {
                let type = storage.get("histoType");
                type = is.array(type) == true ? type[index] : undefined;
                if (is.string(type)) {
                    const title = storage.get("histoNom");
                    const image = storage.get("histoImg");
                    const language = storage.get("histoLang");
                    let episode = storage.get("histoEp");
                    data.type = type.toUpperCase() == "FILM" ? "MOVIE" : type.toUpperCase() == "SCANS" ? "SCAN" : type;
                    data.title = is.array(title) == true ? title[index] : undefined;
                    data.image = is.array(image) == true ? image[index] : undefined;
                    data.language = is.array(language) == true ? language[index] : undefined;
                    data.url = window.location.pathname;
                    data.urlInfo = `/catalogue/${window.location.pathname.split("/catalogue/")[1].split("/")[0]}`;
                    episode = is.array(episode) == true ? episode[index] : undefined;
                    if (data.type == "SCAN") {
                        const saved = storage.get(`savedChapNb${data.url}`);
                        if (is.string(episode)) data.chapter = episode.split("Chapitre")[1].trim();
                        else if (is.number(episode)) data.chapter = Number(episode).toString();
                        if (is.number(saved)) data.saved = saved;
                    } else {
                        const saved = storage.get(`savedEpNb${data.url}`);
                        if (is.string(episode)) data.episode = episode.split("Episode")[1].trim();
                        else if (is.number(episode)) data.episode = Number(episode).toString();
                        if (data.type != "MOVIE") data.season = type.trim().replace("partie", "-");
                        if (is.number(saved)) data.saved = saved;
                    };
                    return data;
                } else return data;
            } else return data;
        };
        const getWatchData = () => {
            let data = {};
            let index = storage.get("watchlistUrl");
            index = is.array(index) == true ? index.findIndex(pathname => is.string(pathname) == true && (pathname.endsWith("/") ? pathname.slice(0, pathname.lastIndexOf("/")) : pathname) == currentPathName) : -1;
            if (index >= 0) {
                const title = storage.get("watchlistNom");
                const image = storage.get("watchlistImg");
                data.url = window.location.pathname;
                data.title = is.array(title) == true ? title[index] : undefined;
                data.image = is.array(image) == true ? image[index] : undefined;
                return data;
            } else return data;
        };
        const getFavoData = () => {
            let data = {};
            let index = storage.get("favoriUrl");
            index = is.array(index) == true ? index.findIndex(pathname => is.string(pathname) == true && (pathname.endsWith("/") ? pathname.slice(0, pathname.lastIndexOf("/")) : pathname) == currentPathName) : -1;
            if (index >= 0) {
                const title = storage.get("favoriNom");
                const image = storage.get("favoriImg");
                data.url = window.location.pathname;
                data.title = is.array(title) == true ? title[index] : undefined;
                data.image = is.array(image) == true ? image[index] : undefined;
                return data;
            } else return data;
        };
        if (episode) new MutationObserver(() => ipcRenderer.send("episodeChange", getHistoData())).observe(episode, {
            childList: true
        });
        if (scan) {
            new MutationObserver(() => ipcRenderer.send("scanChange", getHistoData())).observe(scan, {
                childList: true
            });
            ipcRenderer.send("scanChange", getHistoData());
        };
        if (watchlist) watchlist.addEventListener("click", () => {
            const checkedWatchlist = document.getElementById("checkedWatchlist");
            if (checkedWatchlist) new MutationObserver((record, observe) => {
                ipcRenderer.send("watchlistChange", getWatchData());
                observe.disconnect();
            }).observe(checkedWatchlist, {
                attributes: true
            });
        });
        if (favorite) favorite.addEventListener("click", () => {
            const checkedFavoris = document.getElementById("checkedFavoris");
            if (checkedFavoris) new MutationObserver((record, observe) => {
                ipcRenderer.send("favoriteChange", getFavoData());
                observe.disconnect();
            }).observe(checkedFavoris, {
                attributes: true
            });
        });
    };
    ipcRenderer.on("importHistory", (event, url, type, title, image, language, episode, saved) => {
        if (is.url(url) && is.string(type)) {
            const isScan = type.toUpperCase() == "SCANS" ? true : false;
            url = new URL(url).pathname;
            let histoUrl = storage.get("histoUrl");
            if (!is.array(histoUrl)) histoUrl = [];
            const alreadyExist = histoUrl.findIndex(pathname => is.string(pathname) == true && (pathname.endsWith("/") ? pathname.slice(0, pathname.lastIndexOf("/")) : pathname) == (url.endsWith("/") ? url.slice(0, url.lastIndexOf("/")) : url));
            let index = alreadyExist;
            if (alreadyExist < 0) {
                histoUrl.push(url);
                storage.set("histoUrl", histoUrl);
                index = histoUrl.length - 1;
                let histoType = storage.get("histoType");
                if (!is.array(histoType)) histoType = [];
                histoType[index] = type;
                storage.set("histoType", histoType);
                if (is.string(title)) {
                    let histoNom = storage.get("histoNom");
                    if (!is.array(histoNom)) histoNom = [];
                    histoNom[index] = title;
                    storage.set("histoNom", histoNom);
                };
                if (is.url(image)) {
                    let histoImg = storage.get("histoImg");
                    if (!is.array(histoImg)) histoImg = [];
                    histoImg[index] = image;
                    storage.set("histoImg", histoImg);
                };
                if (is.string(language)) {
                    let histoLang = storage.get("histoLang");
                    if (!is.array(histoLang)) histoLang = [];
                    histoLang[index] = language;
                    storage.set("histoLang", histoLang);
                };
            };
            if (is.string(episode)) {
                let histoEp = storage.get("histoEp");
                if (!is.array(histoEp)) histoEp = [];
                histoEp[index] = episode;
                storage.set("histoEp", histoEp);
                storage.set(isScan == true ? `savedChapName${url}` : `savedEpName${url}`, JSON.stringify(episode));
            };
            if (is.number(saved)) storage.set(isScan == true ? `savedChapNb${url}` : `savedEpNb${url}`, saved);
        };
    });
    ipcRenderer.on("importWatchlist", (event, url, title, image) => {
        if (is.url(url)) {
            url = new URL(url).pathname;
            let watchlistUrl = storage.get("watchlistUrl");
            if (!is.array(watchlistUrl)) watchlistUrl = [];
            const alreadyExist = watchlistUrl.findIndex(pathname => is.string(pathname) == true && (pathname.endsWith("/") ? pathname.slice(0, pathname.lastIndexOf("/")) : pathname) == (url.endsWith("/") ? url.slice(0, url.lastIndexOf("/")) : url));
            if (alreadyExist < 0) {
                watchlistUrl.push(url);
                storage.set("watchlistUrl", watchlistUrl);
                const index = watchlistUrl.length - 1;
                if (is.string(title)) {
                    let watchlistNom = storage.get("watchlistNom");
                    if (!is.array(watchlistNom)) watchlistNom = [];
                    watchlistNom[index] = title;
                    storage.set("watchlistNom", watchlistNom);
                };
                if (is.url(image)) {
                    let watchlistImg = storage.get("watchlistImg");
                    if (!is.array(watchlistImg)) watchlistImg = [];
                    watchlistImg[index] = image;
                    storage.set("watchlistImg", watchlistImg);
                };
            };
        };
    });
    ipcRenderer.on("importFavorite", (event, url, title, image) => {
        if (is.url(url)) {
            url = new URL(url).pathname;
            let favoriUrl = storage.get("favoriUrl");
            if (!is.array(favoriUrl)) favoriUrl = [];
            const alreadyExist = favoriUrl.findIndex(pathname => is.string(pathname) == true && (pathname.endsWith("/") ? pathname.slice(0, pathname.lastIndexOf("/")) : pathname) == (url.endsWith("/") ? url.slice(0, url.lastIndexOf("/")) : url));
            if (alreadyExist < 0) {
                favoriUrl.push(url);
                storage.set("favoriUrl", favoriUrl);
                const index = favoriUrl.length - 1;
                if (is.string(title)) {
                    let favoriNom = storage.get("favoriNom");
                    if (!is.array(favoriNom)) favoriNom = [];
                    favoriNom[index] = title;
                    storage.set("favoriNom", favoriNom);
                };
                if (is.url(image)) {
                    let favoriImg = storage.get("favoriImg");
                    if (!is.array(favoriImg)) favoriImg = [];
                    favoriImg[index] = image;
                    storage.set("favoriImg", favoriImg);
                };
            };
        };
    });
});