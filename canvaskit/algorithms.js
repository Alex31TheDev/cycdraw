// config
const initSorts = () => {
    // selection
    function selectionSort(viz) {
        const { array, marked } = viz;

        for (let i = 0; i < array.length; i++) {
            let min_idx = i;

            for (let j = i + 1; j < array.length; j++) {
                if (array[min_idx] > array[j]) {
                    min_idx = j;
                    marked.push(j);
                    viz.writeFrame();
                }
            }

            viz.swap(i, min_idx);
            viz.writeFrame();
        }
    }

    // bubble
    function bubbleSort(viz) {
        const { array } = viz;
        let n = array.length,
            swapped;

        do {
            swapped = false;

            for (let i = 0; i < n - 1; i++) {
                if (array[i] > array[i + 1]) {
                    swapped = true;
                    viz.swap(i, i + 1);
                    viz.writeFrame();
                }
            }

            n--;
        } while (swapped);

        return array;
    }

    // insertion
    function insertionSort(viz) {
        const { array } = viz;

        for (let i = 1; i < array.length; i++) {
            let j = i;

            while (j > 0 && array[j] < array[j - 1]) {
                viz.swap(j, j - 1);
                viz.writeFrame();
                j--;
            }
        }
    }

    // quick
    function partition(viz, low, high) {
        const { array } = viz;
        let pivot = array[high],
            i = low - 1;

        for (let j = low; j < high; j++) {
            if (array[j] <= pivot) {
                i++;
                viz.swap(i, j);
                viz.writeFrame();
            }
        }

        viz.swap(i + 1, high);
        viz.writeFrame();

        return i + 1;
    }

    function quickSort(viz, low = 0, high = viz.array.length - 1) {
        if (low < high) {
            const pi = partition(viz, low, high);
            quickSort(viz, low, pi - 1);
            quickSort(viz, pi + 1, high);
        }
    }

    // heap
    function heapify(viz, n, i) {
        const { array } = viz;
        let largest = i;

        const l = 2 * i + 1,
            r = 2 * i + 2;

        if (l < n && array[l] > array[largest]) largest = l;
        if (r < n && array[r] > array[largest]) largest = r;

        if (largest !== i) {
            viz.swap(i, largest);
            viz.writeFrame();
            heapify(viz, n, largest);
        }
    }

    function heapSort(viz) {
        const { array } = viz;

        for (let i = Math.floor(array.length / 2) - 1; i >= 0; i--) {
            heapify(viz, array.length, i);
        }

        for (let i = array.length - 1; i > 0; i--) {
            viz.swap(0, i);
            viz.writeFrame();
            heapify(viz, i, 0);
        }
    }

    // merge
    function merge(viz, leftStart, leftEnd, rightStart, rightEnd) {
        const { array, marked } = viz;
        let temp = [],
            i = leftStart,
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
            viz.writeFrame();
        }

        while (i <= leftEnd) {
            temp.push(array[i]);
            i++;

            marked.push(i);
            viz.writeFrame();
        }

        while (j <= rightEnd) {
            temp.push(array[j]);
            j++;

            marked.push(j);
            viz.writeFrame();
        }

        for (let k = 0; k < temp.length; k++) {
            array[leftStart + k] = temp[k];

            if (leftEnd - leftStart >= array.length / 50) {
                marked.push(leftStart + k);
                viz.writeFrame();
            }
        }
    }

    function mergeSort(viz, start = 0, end = viz.array.length - 1) {
        if (start >= end) return;

        const mid = Math.floor((start + end) / 2);
        mergeSort(viz, start, mid);
        mergeSort(viz, mid + 1, end);
        merge(viz, start, mid, mid + 1, end);
    }

    // in-place merge
    function mergeInPlace(viz, low, mid, high) {
        const { array, marked } = viz;
        let left = low,
            right = mid + 1;

        while (left <= mid && right <= high) {
            if (array[left] <= array[right]) {
                left++;
            } else {
                let temp = array[right],
                    index = right;

                viz.nth *= 2;

                while (index > left) {
                    array[index] = array[index - 1];
                    marked.push(index - 1, index);
                    viz.writeFrame();
                    index--;
                }

                array[left] = temp;
                marked.push(left, right);

                viz.nth /= 2;
                viz.writeFrame();

                left++;
                mid++;
                right++;
            }
        }
    }

    function mergeSortInPlace(viz, low = 0, high = viz.array.length - 1) {
        if (low < high) {
            const mid = Math.floor((low + high) / 2);
            mergeSortInPlace(viz, low, mid);
            mergeSortInPlace(viz, mid + 1, high);
            mergeInPlace(viz, low, mid, high);
        }
    }

    // in-place radix LSD
    function analyzePow(viz, radix) {
        const { array, marked } = viz;
        let pow = 0;

        for (let i = 0; i < array.length; i++) {
            const logValue = Math.log(array[i]) / Math.log(radix);
            if (Math.floor(logValue) > pow) pow = Math.floor(logValue);

            marked.push(i);
            if (i % 2 === 0) viz.writeFrame();
        }

        return pow;
    }

    function swapUpToNM(viz, pos, to) {
        const { marked } = viz;
        if (to - pos > 0) {
            for (let i = pos; i < to; i++) viz.swap(i, i + 1);
        } else {
            for (let i = pos; i > to; i--) viz.swap(i, i - 1);
        }
        marked.length = 2;
    }

    function getDigit(a, power, radix) {
        return Math.floor(a / Math.pow(radix, power)) % radix;
    }

    function inPlaceRadixLSDSort(viz, radix = 3) {
        const { array, marked } = viz,
            vRegs = Array(radix - 1),
            maxPower = analyzePow(viz, radix);

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
                    viz.writeFrame();
                } else {
                    swapUpToNM(viz, pos, vRegs[digit - 1]);
                    marked.push(...vRegs);
                    viz.writeFrame();

                    for (let j = digit - 1; j > 0; j--) {
                        vRegs[j - 1]--;
                    }
                }
            }
        }
    }

    // gravity
    function analyzeMax(viz) {
        const { array, marked } = viz;
        let max = -Infinity;

        for (let i = 0; i < array.length; i++) {
            max = Math.max(array[i], max);
            marked.push(i);
            if (i % 2 === 0) viz.writeFrame();
        }

        return max;
    }

    function gravitySort(viz) {
        const { array, marked } = viz,
            max = analyzeMax(viz),
            abacus = Array.from({ length: array.length }, () => Array(max).fill(0));

        viz.nth *= 10;

        for (let j = 0; j < array.length; j++) {
            for (let k = 0; k < Math.floor(array[j]); k++) {
                abacus[j][k] = 1;
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
                viz.writeFrame();
            }
        }

        viz.nth /= 10;
    }

    // shell
    function shellSort(viz) {
        const { array } = viz;
        for (let gap = Math.floor(array.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
            for (let i = gap; i < array.length; i++) {
                let j = i;
                while (j >= gap && array[j] < array[j - gap]) {
                    viz.swap(j, j - gap);
                    viz.writeFrame();
                    j -= gap;
                }
            }
        }
    }

    // bitonic
    function bitonicSort(viz) {
        const { array } = viz;

        function bitonicMerge(low, count, dir) {
            if (count > 1) {
                let k = 1;
                while (k < count) k <<= 1;
                k >>= 1;

                for (let i = low; i < low + count - k; i++) {
                    if (dir ? array[i] > array[i + k] : array[i] < array[i + k]) {
                        viz.swap(i, i + k);
                        viz.writeFrame();
                    }
                }

                bitonicMerge(low, k, dir);
                bitonicMerge(low + k, count - k, dir);
            }
        }

        function sort(low, count, dir) {
            if (count > 1) {
                const mid = Math.floor(count / 2);
                sort(low, mid, !dir);
                sort(low + mid, count - mid, dir);
                bitonicMerge(low, count, dir);
            }
        }

        sort(0, array.length, true);
    }

    // comb
    function combSort(viz) {
        const { array } = viz;
        let gap = array.length,
            swapped = true;

        while (gap > 1 || swapped) {
            gap = Math.floor(gap / 1.3);
            if (gap < 1) gap = 1;

            swapped = false;

            for (let i = 0; i + gap < array.length; i++) {
                if (array[i] > array[i + gap]) {
                    viz.swap(i, i + gap);
                    viz.writeFrame();
                    swapped = true;
                }
            }
        }
    }

    // grail
    function grailMultiSwap(viz, a, b, count) {
        while (count !== 0) {
            viz.swap(a++, b++);
            viz.writeFrame();
            count--;
        }
    }

    function grailRotate(viz, pos, lenA, lenB) {
        while (lenA !== 0 && lenB !== 0) {
            if (lenA <= lenB) {
                grailMultiSwap(viz, pos, pos + lenA, lenA);
                pos += lenA;
                lenB -= lenA;
            } else {
                grailMultiSwap(viz, pos + (lenA - lenB), pos + lenA, lenB);
                lenA -= lenB;
            }
        }
    }

    function grailBinSearch(viz, pos, len, keyPos, isLeft) {
        let left = -1,
            right = len;

        while (left < right - 1) {
            const mid = left + ((right - left) >> 1);
            viz.marked.push(keyPos, pos + mid);
            viz.writeFrame();

            if (isLeft) {
                if (viz.array[pos + mid] >= viz.array[keyPos]) right = mid;
                else left = mid;
            } else {
                if (viz.array[pos + mid] > viz.array[keyPos]) right = mid;
                else left = mid;
            }
        }

        return right;
    }

    function grailMergeWithoutBuffer(viz, pos, len1, len2) {
        if (len1 < len2) {
            while (len1 !== 0) {
                const loc = grailBinSearch(viz, pos + len1, len2, pos, true);

                if (loc !== 0) {
                    grailRotate(viz, pos, len1, loc);
                    pos += loc;
                    len2 -= loc;
                }

                if (len2 === 0) break;

                do {
                    pos++;
                    len1--;
                    viz.marked.push(pos, pos + len1);
                    viz.writeFrame();
                } while (len1 !== 0 && viz.array[pos] <= viz.array[pos + len1]);
            }
        } else {
            while (len2 !== 0) {
                const loc = grailBinSearch(viz, pos, len1, pos + (len1 + len2 - 1), false);

                if (loc !== len1) {
                    grailRotate(viz, pos + loc, len1 - loc, len2);
                    len1 = loc;
                }

                if (len1 === 0) break;

                do {
                    len2--;
                    viz.marked.push(pos + len1 - 1, pos + len1 + len2 - 1);
                    viz.writeFrame();
                } while (len2 !== 0 && viz.array[pos + len1 - 1] <= viz.array[pos + len1 + len2 - 1]);
            }
        }
    }

    function grailSort(viz) {
        const len = viz.array.length;

        for (let dist = 1; dist < len; dist += 2) {
            if (viz.array[dist - 1] > viz.array[dist]) {
                viz.swap(dist - 1, dist);
                viz.writeFrame();
            }
        }

        for (let part = 2; part < len; part *= 2) {
            let left = 0;
            const right = len - 2 * part;

            while (left <= right) {
                grailMergeWithoutBuffer(viz, left, part, part);
                left += 2 * part;
            }

            const rest = len - left;
            if (rest > part) {
                grailMergeWithoutBuffer(viz, left, part, rest - part);
            }
        }
    }

    return {
        selection: selectionSort,
        bubble: bubbleSort,
        insertion: insertionSort,
        quick: quickSort,
        heap: heapSort,
        merge: mergeSort,
        mergeInPlace: mergeSortInPlace,
        radixLsdInPlace: viz => inPlaceRadixLSDSort(viz, 3),
        gravity: gravitySort,
        shell: shellSort,
        bitonic: bitonicSort,
        comb: combSort,
        grailsort: grailSort
    };
};
