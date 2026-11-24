// The background location task must be defined before the app registers,
// so Android can wake the app headlessly and still find the task.
import './src/location/backgroundTask';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
