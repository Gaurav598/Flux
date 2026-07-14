import React from 'react';
import {ImageBackground, StyleSheet, View} from 'react-native';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {store, RootState, AppDispatch} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import {bootstrapAuth} from './src/store/thunks/authThunks';
import './global.css';

const SPLASH_DURATION_MS = 1000;

const RootGate = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {isInitialized} = useSelector((state: RootState) => state.auth);
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || !isInitialized) {
    return (
      <View style={styles.splashContainer}>
        <ImageBackground
          source={require('./screen-load.png')}
          style={styles.splashImage}
          imageStyle={styles.splashImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  return <AppNavigator />;
};

const App = () => (
  <Provider store={store}>
    <RootGate />
  </Provider>
);

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
  },
  splashImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default App;
