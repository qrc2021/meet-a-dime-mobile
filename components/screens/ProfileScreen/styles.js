import { StyleSheet, Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#dceaff',
    paddingTop: height / 4.5,
  },
  innerContainer: { flexDirection: 'row' },

  title: {},
  logo: {
    flex: 1,
    height: 150,
    width: 150,
    borderRadius: 150 / 2,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#E64398',
    alignSelf: 'center',
    margin: 10,
    marginTop: 35,
  },
  rangeContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 25,
    marginTop: 25,
    marginBottom: 25,
  },
  responseContainer: { flex: 1, alignItems: 'center' },
  response: {
    fontSize: 11,
  },
  headingContainer: { flex: 1, alignItems: 'center', marginBottom: 10 },
  heading: {
    fontSize: 26,
    color: '#E64398',
  },
  success: { fontSize: 16, color: '#E64398' },
  slider: {
    width: width / 1.5,
    height: 1 / 2,
  },
  range: {
    marginBottom: 1,
  },
  end: { fontSize: 10, alignItems: 'center' },
  input: {
    height: 63,
    // color: '#E64398',
    // borderRadius: 5,
    overflow: 'hidden',
    // backgroundColor: 'white',
    justifyContent: 'center',
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 30,
    marginRight: 30,
    // paddingLeft: 10,
    // paddingRight: 10,
    // paddingBottom: 20,
  },

  firstname: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 63,
    borderRadius: 5,
    overflow: 'visible',
    // backgroundColor: 'white',
    maxWidth: width / 2.5,
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 15,
    marginRight: 3,
    paddingLeft: 16,
  },
  lastname: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 63,
    borderRadius: 5,
    overflow: 'hidden',
    //backgroundColor: 'white',
    maxWidth: width / 2.5,
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 35,
    marginRight: 3,
    paddingLeft: 0,
  },
  button: {
    // backgroundColor: '#e64398',
    marginLeft: 30,
    marginRight: 30,
    marginTop: 20,
    height: 48,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGroup: {},
  button: {
    backgroundColor: '#e64398',
    marginLeft: 30,
    marginRight: 30,
    marginTop: 15,
    height: 48,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: width / 2.25,
  },
  generalError: {
    fontSize: 11,
    paddingBottom: 8 / 2,
    paddingTop: 8 / 2,
    textAlign: 'center',
    color: '#fc1f4a',
  },
  register: {
    backgroundColor: '#e64398',
    marginLeft: 30,
    marginRight: 30,
    marginTop: 5,
    marginBottom: 35,
    height: 48,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerView: {
    flex: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  Confirm: {
    flex: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#2e2e2d',
  },
  footerLink: {
    color: '#E64398',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
