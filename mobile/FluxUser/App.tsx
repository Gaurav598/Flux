import React from 'react';
import {StyleSheet, View, ActivityIndicator, StatusBar} from 'react-native';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {store, RootState, AppDispatch} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import {bootstrapAuth} from './src/store/thunks/authThunks';
import './global.css';

const RootGate = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {isInitialized} = useSelector((state: RootState) => state.auth);

  React.useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000',
        }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#EAB308" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <AppNavigator />
    </>
  );
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
