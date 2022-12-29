let concatenateUrls = (...urls: string[]) => {
    return urls
        .filter(url => !!url)
        .map(url => url.toString())
        .map((url, index) => {
            if (index > 0 && url.startsWith("/")) {
                url = url.substring(1);
            }
            if (index !== urls.length - 1 && url.endsWith("/")) {
                url = url.substring(0, url.length - 1);
            }
            return url;
        })
        .join("/");
};

const isSameUrl = (url1: string, url2: string) => {
    if (!url1.startsWith("/")) {
        url1 = "/" + url1;
    }
    if (!url2.startsWith("/")) {
        url2 = "/" + url2;
    }
    if (!url1.endsWith("/")) {
        url1 = url1 + "/";
    }
    if (!url2.endsWith("/")) {
        url2 = url2 + "/";
    }
    return url1 === url2;
};

export {isSameUrl, concatenateUrls};
