import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of as observableOf } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { RequestParams } from '../interfaces/request-params';
import { ToastService } from './toast/toast.service';
import { AuthService, DeviceInfo, SharedPreferences } from 'sunbird-sdk';
import * as jwt_decode from "jwt-decode";
import * as moment from 'moment';
import { ApiUtilsService } from './api-utils.service';
import { HTTP } from '@ionic-native/http/ngx';
import { env } from 'process';
import { auth,clientid,clientsecret } from '@app/configuration/configuration';



@Injectable({
  providedIn: 'root'
})
export class ApiService {
  baseUrl: string;
  tokens;
  authToken;
  access;
  constructor(
    public http: HttpClient,
    public toast: ToastService,
    public modalController: ModalController,
    @Inject('AUTH_SERVICE') public authService: AuthService,
    @Inject('DEVICE_INFO') public deviceInfo: DeviceInfo,
    @Inject('SHARED_PREFERENCES') public preferences: SharedPreferences,
    public apiUtils: ApiUtilsService,
    public ionicHttp: HTTP,
  ) {
    this.getToken();
  }
   setHeaders(session) {
    const headers = {
      'Authorization': this.authToken ? this.authToken  : '',
      'x-auth-token': session ? session.access_token : '',
      'X-authenticated-user-token': session ? session.access_token : '',
      'Content-Type': 'application/json',
      'X-App-Id': this.apiUtils.appName,
      'deviceId': this.deviceInfo.getDeviceID(),
    }
    if(!session?.access_token){
      delete headers['X-authenticated-user-token'];
      delete headers['x-auth-token']
    }
    return headers;
  }

  get(requestParam: RequestParams): Observable<any> {
    return this.checkTokenValidation().pipe(
      mergeMap(session => {
        const headers = session ? this.setHeaders(session) : {};
          this.ionicHttp.setDataSerializer('json');
          return this.ionicHttp.get(this.baseUrl + requestParam.url, '', headers).then(
            data => {
              console.log("get data",data)
              return JSON.parse(data.data);
            }, error => {
              console.log("get error",error)
              catchError(this.handleError(error))
            },
          );
      })
    )
  }

  checkTokenValidation(): Observable<any> {
    return this.authService.getSession().pipe(
      mergeMap(tokens => {
        if(tokens){
          const token = jwt_decode(tokens.access_token);
          const tokenExpiryTime = moment(token.exp * 1000);
          const currentTime = moment(Date.now());
          const duration = moment.duration(tokenExpiryTime.diff(currentTime));
          const hourDifference = duration.asHours();
          if (hourDifference < 2) {
            return this.authService.refreshSession().pipe(
              mergeMap(refreshData => {
                return this.authService.getSession()
              })
            )
          } else {
            return this.authService.getSession()
          }
        }else{
          return observableOf({})
        }
      })
    )
  }

  getToken() {
    this.preferences.getString('api_bearer_token_v2').subscribe(resp => {
      this.authToken = `Bearer ${resp}`;
    });
  }

  post(requestParam: RequestParams): Observable<any> {
    return this.checkTokenValidation().pipe(
      mergeMap(session => {
         const headers = session ? this.setHeaders(session) :{};
          let body = requestParam.payload ? requestParam.payload : {};
          this.ionicHttp.setDataSerializer('json');
          if(requestParam.url == '/api/user/v3/create'){
            const headers = {
              'Authorization':  auth 
            }
            return this.ionicHttp.post(this.baseUrl + requestParam.url, body, headers).then(
              data => {
                console.log("post data",data)
               return JSON.parse(data.data);
              }, error => {
                console.log("post error",error)
                return error
                // catchError(this.handleError(error))
              });
          }
          else if (requestParam.url == '/auth/realms/sunbird/protocol/openid-connect/token'){
            const body1 = {
              client_id: 'implementation',
              client_secret: clientsecret, // Use the actual client secret value
              grant_type: 'password',
              username: requestParam?.payload?.request?.username,
              password: requestParam?.payload?.request?.password
            };
            
            // Convert body1 to URL-encoded format
            const urlEncodedBody = Object.keys(body1)
              .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(body1[key]))
              .join('&');
            
            console.log("body1", urlEncodedBody);
            
            const headers = {
              'Content-Type': 'application/x-www-form-urlencoded'
            };
            
            // Using the 'advanced-http' plugin's setDataSerializer method to handle URL-encoded data
            this.ionicHttp.setDataSerializer('urlencoded');
            
            return this.ionicHttp.post(this.baseUrl + requestParam.url, body1, headers).then(
              async response => {
                console.log("Response:", response);
              return this.access = JSON.parse(response.data);
              }
            ).catch(
              error => {
                console.log("Error:", error);
                return JSON.parse(error.data)
              
              }
            );
          }
          else if(requestParam.url == '/api/user/v3/update'){
            console.log("requestParam123",requestParam)
            const headers = {
              'Authorization': auth,
              'x-auth-token': this.access.access_token,
              'X-authenticated-user-token':this.access.access_token,
              'Content-Type': 'application/json',
              'X-App-Id': this.apiUtils.appName,
              'deviceId': this.deviceInfo.getDeviceID(),
            }
            console.log("body1",body)
            return this.ionicHttp.patch(this.baseUrl + requestParam.url, body, headers).then(
              data => {
                console.log("post data",data)
               return JSON.parse(data.data);
              }, error => {
                console.log("post error",error)
                return JSON.parse(error.data);
                // catchError(this.handleError(error))
              });
          }
          else {
            return this.ionicHttp.post(this.baseUrl + requestParam.url, body, headers).then(
              data => {
                console.log("post data not ",data)
                return JSON.parse(data.data);
              }, error => {
                console.log("post error not",error)
                return JSON.parse(error.data);
              });
          }
        
          
      })
    )
  }

  delete(requestParam: RequestParams): Observable<any> {
    return this.checkTokenValidation().pipe(
      mergeMap(session => {
        const headers = this.setHeaders(session);
          return this.ionicHttp.delete(this.baseUrl + requestParam.url, '', headers).then(data => {
            return data
          }, error => {
            catchError(this.handleError(error))
          })
      })
    )
  }



  private handleError(result) {
    let status  = result.status <= 0 ? 0 :result.status;
    switch (status) {
      case 0:
        this.toast.showMessage('FRMELEMNTS_MSG_YOU_ARE_WORKING_OFFLINE_TRY_AGAIN', 'danger')
        break
      case 401:
        this.toast.showMessage('Session expired', 'danger')
        break
      default:
        const errorMessage = result.error ? JSON.parse(result.error).message : 'FRMELEMNTS_MSG_SOMETHING_WENT_WRONG'
        this.toast.showMessage(errorMessage, 'danger')

    }
    return (error: any): Observable<any> => {
      return observableOf(result);
    };
  }
}