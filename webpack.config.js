import path from 'path';

export default {
    mode: 'development',
    entry: './src/index.js',
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: 'bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                },
            },
        ],
    },
    devServer: {
        static: {
            directory: path.join(process.cwd(), 'dist'), // Serve files from 'dist'
        },
        port: 8080, // You can change the port if needed
        open: true, // Automatically open the browser
        hot: true, // Enable Hot Module Replacement (HMR)
        compress: true, // Enable gzip compression
    },
};