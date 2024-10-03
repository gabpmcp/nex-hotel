import axios from 'axios';
import { getDecisionKey } from '../../config.js';

const executeCamundaEngine = async ({ roomType, days, isWeekend, availability }: { roomType: string, days: number, isWeekend: boolean, availability: number }) => {
    try {
        // Variables a enviar al motor de Camunda
        const variables = {
            "RoomType": { "value": roomType, "type": "String" },
            "Days": { "value": days, "type": "Integer" },
            "IsWeekend": { "value": isWeekend, "type": "Boolean" },
            "Availability": { "value": availability, "type": "Integer" }
        }

        // Ejecutar el archivo DMN en Camunda mediante su API REST
        const { data: [{ FinalPrice: { value } }] } = await axios.post(`http://localhost:8080/engine-rest/decision-definition/key/${getDecisionKey()}/evaluate`, {
            variables
        })

        // Parsear y devolver el precio calculado
        console.log(`variables: ${JSON.stringify(variables, null, 2)} \n DecisionKey: ${getDecisionKey()} \n price: ${value}`);
        return value;
    } catch (error) {
        console.error('Error ejecutando Camunda:', error);
        return null;
    }
}

export default executeCamundaEngine