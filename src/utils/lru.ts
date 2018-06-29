export type LRU<T> = {
    size: number;
    queue: T[];
};

export const insert = <T>(lru: LRU<T>, item: T): LRU<T> => {
    if (lru.queue.length < lru.size) {
        return { ...lru, queue: [...lru.queue, item] };
    }

    const [old, ...rest] = lru.queue;
    return { ...lru, queue: [...rest, item] };
};

export const create = <T>(size: number, init: T[]): LRU<T> => {
    if (init.length > size) {
        throw "LRU: Initial items cannot be bigger than size";
    }
    return {
        size,
        queue: init
    };
};

export const empty = <T>(lru: LRU<T>): LRU<T> => ({ ...lru, queue: [] });
