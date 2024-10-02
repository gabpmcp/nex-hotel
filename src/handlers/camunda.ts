import axios from 'axios';
import exp from 'constants';
import fs from 'fs';

const executeCamundaEngine = async ({ roomType, days, isWeekend, availability }: { roomType: string, days: number, isWeekend: boolean, availability: number }) => {
    try {
        // Cargar el archivo DMN
        // const dmnFile = fs.readFileSync('../../rules/DynamicRoomPricing.dmn', 'utf8');

        // Variables a enviar al motor de Camunda
        const variables = {
            "RoomType": { "value": roomType, "type": "String" },
            "Days": { "value": days, "type": "Integer" },
            "IsWeekend": { "value": isWeekend, "type": "Boolean" },
            "Availability": { "value": availability, "type": "Integer" }
        }

        // Ejecutar el archivo DMN en Camunda mediante su API REST
        const response = await axios.post('http://localhost:8080/engine-rest/decision-definition/key/Decision_056hkp1/evaluate', {
            variables
        });

        // Parsear y devolver el precio calculado
        const price = response.data[0]?.price?.value;
        return price;
    } catch (error) {
        console.error('Error ejecutando Camunda:', error);
        return null;
    }
};

export default executeCamundaEngine