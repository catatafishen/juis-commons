import JuisEvent, {EventProperties} from "../listenable/JuisEvent.js";

class NavigationRequest extends JuisEvent {
    url: string;
    replaceHistory: boolean;

    constructor(url: string, replaceHistory = false, eventProperties?: EventProperties) {
        super(eventProperties);
        this.url = url;
        this.replaceHistory = replaceHistory;
    }
}

class Navigation extends JuisEvent {
    url: string;
    consumedUrl: string;
    parameters: Record<string, string>;

    constructor(url: string, consumedUrl: string, parameters: Record<string, string>, eventProperties?: EventProperties) {
        super({...eventProperties, propagating: false});
        this.url = url;
        this.consumedUrl = consumedUrl;
        this.parameters = parameters;
    }
}

export {NavigationRequest, Navigation};
