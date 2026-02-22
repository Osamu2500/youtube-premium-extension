// feature-loader.js

// Function to Lazy Load Features
function lazyLoadFeature(featureName) {
    return import(`./features/${featureName}`).then(module => {
        return module.default;
    }).catch(error => {
        console.error(`Error loading feature ${featureName}:`, error);
    });
}

// Example usage
// lazyLoadFeature('exampleFeature');

export default lazyLoadFeature;
