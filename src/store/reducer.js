import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import axios from 'axios';

import getDistance from './GetDistance';


const initialState = {
	name: '',
    age: '',
    gender: "Male",
    searchExpression: '',
	selectedNCTId:'',
	trails: [],
	successRateArray: []
}

export function updateSearchDetails(searchDetails) {
	return {
		type: 'UPDATE_SEARCH_DETAILS',
		payload: { "props": searchDetails }
	}
}

export function updateSelectedNCTID(NCTID) {
	return {
		type: 'UPDATE_SELECTED_NCTID',
		payload: { "NCTID": NCTID }
	}
}

export function updateTrailsArr(){
	return(dispatch, getState) => {
		const searchExpression = getState().searchExpression;
		const gender = getState().gender;
		const fields = 'NCTId,OfficialTitle,Gender,MinimumAge,MaximumAge,OverallStatus,BriefSummary,Condition,LocationCountry,EnrollmentCount,StudyFirstSubmitDate';
            axios.get('https://clinicaltrials.gov/api/query/study_fields?expr=' + searchExpression + '&fields=' +  fields +'&min_rnk=1&max_rnk=100&fmt=JSON')
                .then( response => {
					//Fetching the data
					const trailsData = response.data.StudyFieldsResponse.StudyFields;
					//Filtering the data
					const filteredData = trailsData.filter( trail => {
						            return (
						                (gender === trail.Gender[0] || 
						                trail.Gender[0] === 'All') 
						                &&
						                (trail.OverallStatus[0] === "Not yet recruiting" || 
						                trail.OverallStatus[0] === "Recruiting" ||
						                trail.OverallStatus[0] === "Enrolling by invitation" ||
						                trail.OverallStatus[0] === "Active") 
						                &&
										trail.LocationCountry[0] !== undefined 
										&& 
						                trail.EnrollmentCount[0] !== undefined        
						            );
								});

					filteredData.forEach( trail => { 
						const {LocationCountry, StudyFirstSubmitDate, EnrollmentCount} = trail
             			const distance = getDistance(LocationCountry[0]);
    			        const end = Date.now();
				        const elapsed = (end - Date.parse(StudyFirstSubmitDate[0])) / (1000 * 60 * 60 * 24)
            
   				        fetch('http://127.0.0.1:5000/predict', {
    			            method: 'POST',
    			            headers: {
    			                'Content-Type': 'application/json'
    			            },
    			            body: JSON.stringify({
   				            	"LocationCountry": distance, 
				                "Duration": elapsed, 
				                "EnrollmentCount": EnrollmentCount[0]
				            }) 
						})
						.then(res => res.json())
						.then(resData => {
							dispatch({
								type: "UPDATE_TRAILS_ARR",
								filteredData: filteredData,
								successRateItem: resData.success_rate
							})
						})
					});
				})		
	}
}

const reducer = (state = initialState, action) => {
	switch( action.type ) {
		case 'UPDATE_SEARCH_DETAILS':
			return {
				...state,
				name: action.payload.props.name,
    			age: action.payload.props.age,
    			gender: action.payload.props.gender,
    			searchExpression: action.payload.props.searchExpression
			};
		case 'UPDATE_SELECTED_NCTID':
			return {
				...state,
				selectedNCTId: action.payload.NCTID
			};	
		case 'UPDATE_TRAILS_ARR':
			return {
				...state,
				trails: action.filteredData,
				successRateArray: [...state.successRateArray, action.successRateItem]
			}
		default:
			return state;

	// eslint-disable-next-line no-unreachable
	};
}

const store = createStore(reducer, applyMiddleware(thunk));
export default store;