// NEW FILE
// f:\Youtube 2.0\tests\lifecycle.test.js

async function test_rapidNavigation() {
    console.log("Starting test_rapidNavigation...");
    const lifecycle = new window.YPP.LifecycleManager();
    
    class MockGlobalBar {
        shouldRunOnCurrentPage() { return true; }
        _teardown() {
            document.querySelectorAll('#ypp-global-bar').forEach(n => n.remove());
        }
        async init(signal) {
            await new Promise(r => setTimeout(r, 50));
            if (signal.aborted) throw new DOMException("Aborted", "AbortError");
            
            const bar = document.createElement('div');
            bar.id = 'ypp-global-bar';
            document.body.appendChild(bar);
        }
    }
    
    lifecycle.register(new MockGlobalBar());

    for (let i = 0; i < 10; i++) {
        document.dispatchEvent(new Event('yt-navigate-finish'));
        await new Promise(r => setTimeout(r, 10)); // Faster than init
    }
    
    await new Promise(r => setTimeout(r, 100)); // Wait for final init
    
    const bars = document.querySelectorAll('#ypp-global-bar').length;
    console.assert(bars === 1, `FAIL: test_rapidNavigation. Expected 1 bar, found ${bars}`);
    console.log(`test_rapidNavigation passed.`);
}

async function test_storageWriteQueue() {
    console.log("Starting test_storageWriteQueue...");
    let writeOrder = [];
    
    // Mock chrome storage
    globalThis.chrome = { storage: { local: { 
        getBytesInUse: async () => 0,
        set: async (obj) => { 
            await new Promise(r => setTimeout(r, 20)); 
            writeOrder.push(Object.keys(obj)[0]); 
        }
    }}};

    window.YPP.StorageManager.set('key1', 'val1');
    window.YPP.StorageManager.set('key2', 'val2');
    await window.YPP.StorageManager.set('key3', 'val3');
    
    console.assert(writeOrder.join(',') === 'key1,key2,key3', 'FAIL: test_storageWriteQueue. Writes were not serialized.');
    console.log(`test_storageWriteQueue passed.`);
}

async function test_observerBusBadSelector() {
    console.log("Starting test_observerBusBadSelector...");
    const bus = new window.YPP.ObserverBus();
    
    let originalWarn = console.warn;
    let warned = false;
    console.warn = (...args) => { if(args[0].includes('Invalid selector')) warned = true; };
    
    bus.subscribe('>>>bad-selector', () => {}, 'TestFeature');
    bus.start();
    
    document.body.appendChild(document.createElement('div')); // trigger mutation
    
    await new Promise(r => requestAnimationFrame(r)); // wait for queue
    
    console.assert(warned, 'FAIL: test_observerBusBadSelector. Expected console.warn to be called for bad selector.');
    console.warn = originalWarn;
    bus.stop();
    console.log(`test_observerBusBadSelector passed.`);
}

async function test_missingTeardown() {
    console.log("Starting test_missingTeardown...");
    const lifecycle = new window.YPP.LifecycleManager();
    let threw = false;
    try {
        lifecycle.register({ init: async () => {}, shouldRunOnCurrentPage: () => true });
    } catch(e) {
        threw = true;
    }
    console.assert(threw, 'FAIL: test_missingTeardown. Expected LifecycleManager to throw on invalid contract.');
    console.log(`test_missingTeardown passed.`);
}

// test_rapidNavigation();
// test_storageWriteQueue();
// test_observerBusBadSelector();
// test_missingTeardown();
