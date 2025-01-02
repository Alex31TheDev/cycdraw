const initSorts = () => {
    // selection
    function selectionSort() {
        for (let i = 0; i < array.length; i++) {
            let min_idx = i;
            for (let j = i + 1; j < array.length; j++) {
                if (array[min_idx] > array[j]) {
                    min_idx = j;

                    marked.push(j);
                    writeFrame();
                }
            }

            swap(i, min_idx);
            writeFrame();
        }
    }

    // bubble
    function bubbleSort() {
        let n = array.length,
            swapped;

        do {
            swapped = false;

            for (let i = 0; i < n - 1; i++) {
                if (array[i] > array[i + 1]) {
                    swapped = true;

                    swap(i, i + 1);
                    writeFrame();
                }
            }

            n--;
        } while (swapped);

        return array;
    }

    // insertion
    function insertionSort() {
        for (let i = 1; i < array.length; i++) {
            let j = i;

            while (j > 0 && array[j] < array[j - 1]) {
                swap(j, j - 1);
                writeFrame();

                j--;
            }
        }
    }

    // quick
    function partition(low, high) {
        let pivot = array[high],
            i = low - 1;

        for (let j = low; j < high; j++) {
            if (array[j] <= pivot) {
                i++;

                swap(i, j);
                writeFrame();
            }
        }

        swap(i + 1, high);
        writeFrame();

        return i + 1;
    }

    function quickSort(low, high) {
        if (low < high) {
            const pi = partition(low, high);

            quickSort(low, pi - 1);
            quickSort(pi + 1, high);
        }
    }

    // heap
    function heapify(n, i) {
        let largest = i;

        const l = 2 * i + 1,
            r = 2 * i + 2;

        if (l < n && array[i] < array[l]) {
            largest = l;
        }

        if (r < n && array[largest] < array[r]) {
            largest = r;
        }

        if (largest !== i) {
            swap(i, largest);
            writeFrame();

            heapify(n, largest);
        }
    }

    function heapSort() {
        let n = array.length;

        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(n, i);
        }

        for (let i = n - 1; i > 0; i--) {
            swap(i, 0);
            writeFrame();

            heapify(i, 0);
        }
    }

    // merge
    function merge(leftStart, leftEnd, rightStart, rightEnd) {
        let temp = [];
        let i = leftStart,
            j = rightStart;

        while (i <= leftEnd && j <= rightEnd) {
            if (array[i] <= array[j]) {
                temp.push(array[i]);
                i++;
            } else {
                temp.push(array[j]);
                j++;
            }

            marked.push(i, j);
            writeFrame();
        }

        while (i <= leftEnd) {
            temp.push(array[i]);
            i++;

            marked.push(i);
            writeFrame();
        }

        while (j <= rightEnd) {
            temp.push(array[j]);
            j++;

            marked.push(j);
            writeFrame();
        }

        for (let k = 0; k < temp.length; k++) {
            array[leftStart + k] = temp[k];

            if (leftEnd - leftStart >= array.length / 50) {
                marked.push(leftStart + k);
                writeFrame();
            }
        }
    }

    function mergeSort(start, end) {
        if (start >= end) {
            return;
        }

        const mid = Math.floor((start + end) / 2);

        mergeSort(start, mid);
        mergeSort(mid + 1, end);

        merge(start, mid, mid + 1, end);
    }

    // in-place merge
    function mergeInPlace(low, mid, high) {
        let left = low,
            right = mid + 1;

        while (left <= mid && right <= high) {
            if (array[left] <= array[right]) {
                left++;
            } else {
                let temp = array[right],
                    index = right;

                nth *= 2;

                while (index > left) {
                    array[index] = array[index - 1];

                    marked.push(index - 1, index);
                    writeFrame();

                    index--;
                }

                array[left] = temp;
                marked.push(left, right);

                nth /= 2;
                writeFrame();

                left++;
                mid++;
                right++;
            }
        }
    }

    function mergeSortInPlace(low, high) {
        if (low < high) {
            const mid = Math.floor((low + high) / 2);

            mergeSortInPlace(low, mid);
            mergeSortInPlace(mid + 1, high);

            mergeInPlace(low, mid, high);
        }
    }

    // in-place radix LSD
    function analyzePow(array, base) {
        let pow = 0;

        for (let i = 0; i < array.length; i++) {
            const logValue = Math.log(array[i]) / Math.log(base);

            if (Math.floor(logValue) > pow) {
                pow = Math.floor(logValue);
            }

            marked.push(i);

            if (i % 2 === 0) {
                writeFrame();
            }
        }

        return pow;
    }

    function swapUpToNM(pos, to) {
        if (to - pos > 0) {
            for (let i = pos; i < to; i++) {
                swap(i, i + 1);
            }
        } else {
            for (let i = pos; i > to; i--) {
                swap(i, i - 1);
            }
        }

        marked.length = 2;
    }

    function getDigit(a, power, radix) {
        return Math.floor(a / Math.pow(radix, power)) % radix;
    }

    function inPlaceRadixLSDSort(radix) {
        const vRegs = Array(radix - 1),
            maxPower = analyzePow(array, radix);

        let pos = 0;

        for (let p = 0; p <= maxPower; p++) {
            for (let i = 0; i < vRegs.length; i++) {
                vRegs[i] = array.length - 1;
            }

            pos = 0;

            for (let i = 0; i < array.length; i++) {
                const digit = getDigit(array[pos], p, radix);

                if (digit === 0) {
                    pos++;

                    marked.push(pos);
                    writeFrame();
                } else {
                    swapUpToNM(pos, vRegs[digit - 1]);

                    marked.push(...vRegs);
                    writeFrame();

                    for (let j = digit - 1; j > 0; j--) {
                        vRegs[j - 1]--;
                    }
                }
            }
        }
    }

    // gravity
    function analyzeMax() {
        let max = -Infinity;

        for (let i = 0; i < array.length; i++) {
            max = Math.max(array[i], max);

            marked.push(i);

            if (i % 2 === 0) {
                writeFrame();
            }
        }

        return max;
    }

    function gravitySort() {
        const max = analyzeMax(),
            abacus = Array.from({ length: array.length }, () => Array(max).fill(0));

        nth *= 10;

        for (let j = 0; j < array.length; j++) {
            for (let k = 0; k < Math.floor(array[j]); k++) {
                abacus[j][max - k - 1] = 1;
            }
        }

        for (let l = 0; l < max; l++) {
            for (let m = 0; m < array.length; m++) {
                if (abacus[m][l] === 1) {
                    let dropPos = m;

                    while (dropPos + 1 < array.length && abacus[dropPos][l] === 1) {
                        dropPos++;
                    }

                    if (abacus[dropPos][l] === 0) {
                        abacus[m][l] = 0;
                        abacus[dropPos][l] = 1;
                    }
                }
            }

            for (let x = 0; x < array.length; x++) {
                let count = 0;

                for (let y = 0; y < max; y++) {
                    count += abacus[x][y];
                }

                array[x] = count;

                marked.push(array.length - l - 1);
                marked[0] = count;
                writeFrame();
            }
        }

        nth /= 10;
    }

    return {
        selection: selectionSort,
        bubble: bubbleSort,
        insertion: insertionSort,
        quick: quickSort,
        heap: heapSort,
        merge: mergeSort,
        mergeInPlace: mergeSortInPlace,
        radixLsdInPlace: inPlaceRadixLSDSort.bind(undefined, 3),
        gravity: gravitySort
    };
};
