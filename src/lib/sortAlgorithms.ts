export type SortKey =
  | "bubble"
  | "selection"
  | "insertion"
  | "gnome"
  | "shaker"
  | "odd-even"
  | "pancake";

export type VelocityKey = "slow" | "normal" | "fast";

export interface SortOption {
  value: SortKey;
  label: string;
}

export interface VelocityOption {
  value: VelocityKey;
  label: string;
  multiplier: number;
}

export interface SortStep {
  active: number[];
}

export const MIN_ELEMENT_COUNT = 10;
export const MAX_ELEMENT_COUNT = 500;
export const DEFAULT_ELEMENT_COUNT = 50;
export const DEFAULT_VELOCITY: VelocityKey = "slow";

export const SORT_OPTIONS: SortOption[] = [
  { value: "bubble", label: "Bubble" },
  { value: "selection", label: "Selection" },
  { value: "insertion", label: "Insertion" },
  { value: "gnome", label: "Gnome" },
  { value: "shaker", label: "Shaker" },
  { value: "odd-even", label: "Odd Even" },
  { value: "pancake", label: "Pancake" },
];

export const VELOCITY_OPTIONS: VelocityOption[] = [
  { value: "slow", label: "Slow", multiplier: 0.275 },
  { value: "normal", label: "Normal", multiplier: 0.5 },
  { value: "fast", label: "Fast", multiplier: 0.95 },
];

const createStep = (...active: number[]): SortStep => ({ active });

const swap = (values: number[], left: number, right: number): void => {
  [values[left], values[right]] = [values[right], values[left]];
};

const flipSection = (values: number[], end: number): void => {
  for (let left = 0, right = end; left < right; left += 1, right -= 1) {
    swap(values, left, right);
  }
};

function* bubbleSort(values: number[]): Generator<SortStep, void, undefined> {
  for (let end = values.length - 1; end > 0; end -= 1) {
    for (let index = 0; index < end; index += 1) {
      if (values[index] > values[index + 1]) {
        swap(values, index, index + 1);
      }

      yield createStep(index, index + 1);
    }
  }
}

function* selectionSort(values: number[]): Generator<SortStep, void, undefined> {
  for (let start = 0; start < values.length - 1; start += 1) {
    let minIndex = start;

    for (let scan = start + 1; scan < values.length; scan += 1) {
      if (values[scan] < values[minIndex]) {
        minIndex = scan;
      }

      yield createStep(minIndex, scan);
    }

    if (minIndex !== start) {
      swap(values, start, minIndex);
    }

    yield createStep(start, minIndex);
  }
}

function* insertionSort(values: number[]): Generator<SortStep, void, undefined> {
  for (let index = 1; index < values.length; index += 1) {
    let current = index;

    while (current > 0 && values[current] < values[current - 1]) {
      swap(values, current, current - 1);
      yield createStep(current - 1, current);
      current -= 1;
    }

    if (current > 0) {
      yield createStep(current - 1, current);
    }
  }
}

function* gnomeSort(values: number[]): Generator<SortStep, void, undefined> {
  let index = 1;

  while (index < values.length) {
    if (index === 0 || values[index] >= values[index - 1]) {
      yield createStep(Math.max(0, index - 1), index);
      index += 1;
      continue;
    }

    swap(values, index, index - 1);
    yield createStep(index - 1, index);
    index -= 1;
  }
}

function* shakerSort(values: number[]): Generator<SortStep, void, undefined> {
  let start = 0;
  let end = values.length - 1;

  while (start < end) {
    let swapped = false;

    for (let index = start; index < end; index += 1) {
      if (values[index] > values[index + 1]) {
        swap(values, index, index + 1);
        swapped = true;
      }

      yield createStep(index, index + 1);
    }

    end -= 1;

    if (!swapped) {
      return;
    }

    swapped = false;

    for (let index = end; index > start; index -= 1) {
      if (values[index - 1] > values[index]) {
        swap(values, index - 1, index);
        swapped = true;
      }

      yield createStep(index - 1, index);
    }

    start += 1;

    if (!swapped) {
      return;
    }
  }
}

function* oddEvenSort(values: number[]): Generator<SortStep, void, undefined> {
  let sorted = false;

  while (!sorted) {
    sorted = true;

    for (let index = 1; index < values.length - 1; index += 2) {
      if (values[index] > values[index + 1]) {
        swap(values, index, index + 1);
        sorted = false;
      }

      yield createStep(index, index + 1);
    }

    for (let index = 0; index < values.length - 1; index += 2) {
      if (values[index] > values[index + 1]) {
        swap(values, index, index + 1);
        sorted = false;
      }

      yield createStep(index, index + 1);
    }
  }
}

function* pancakeSort(values: number[]): Generator<SortStep, void, undefined> {
  for (let size = values.length; size > 1; size -= 1) {
    let maxIndex = 0;

    for (let scan = 1; scan < size; scan += 1) {
      if (values[scan] > values[maxIndex]) {
        maxIndex = scan;
      }

      yield createStep(maxIndex, scan);
    }

    if (maxIndex === size - 1) {
      continue;
    }

    if (maxIndex > 0) {
      flipSection(values, maxIndex);
      yield createStep(0, maxIndex);
    }

    flipSection(values, size - 1);
    yield createStep(0, size - 1);
  }
}

const SORT_GENERATORS: Record<SortKey, (values: number[]) => Generator<SortStep, void, undefined>> = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: insertionSort,
  gnome: gnomeSort,
  shaker: shakerSort,
  "odd-even": oddEvenSort,
  pancake: pancakeSort,
};

export const createSortGenerator = (
  algorithm: SortKey,
  values: number[]
): Generator<SortStep, void, undefined> => SORT_GENERATORS[algorithm](values);

export const getOperationsPerSecond = (elementCount: number, velocity: VelocityKey): number => {
  const baseOperations = Math.min(70000, Math.max(120, Math.floor(elementCount * elementCount * 0.6)));
  const multiplier = VELOCITY_OPTIONS.find((option) => option.value === velocity)?.multiplier ?? 1;

  // Centralizing animation throughput keeps every algorithm consistent while allowing the UI to change speed safely.
  return Math.floor(baseOperations * multiplier);
};
