import type {topics,lessons,courses,problems,questions} from './data';
export type User = {name: string; email: string | null};
export type Catalog={topics:typeof topics;lessons:typeof lessons;courses:typeof courses;problems:typeof problems;questions:typeof questions};
