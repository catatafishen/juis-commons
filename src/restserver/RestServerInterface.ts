export default interface RestServerInterface {

    getById(url: string, id: string, headers?: Record<string, string>): Promise<{}>;

    get(url: string, headers?: Record<string, string>): Promise<{}[]>;

    post<T>(url: string, obj: T, headers?: Record<string, string>): Promise<T>;

    patch<T>(url: string, id: string, obj: Partial<T>, headers?: Record<string, string>): Promise<T>;

    delete(url: string, id: string, headers?: Record<string, string>): Promise<{}>;

}
