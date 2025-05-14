import random
import time
import logging
from datetime import datetime

# Configure logging for data tracking and privacy compliance
logging.basicConfig(filename='disaster_system.log', level=logging.INFO, format='%(asctime)s - %(message)s')

# Mock function to simulate IoT sensor data
def get_iot_data():
    return {
        "temperature": random.uniform(20, 50),
        "humidity": random.uniform(30, 90),
        "seismic_activity": random.uniform(0, 10)  # Richter scale
    }

# AI-based rule for disaster prediction
def predict_disaster(data):
    if data["seismic_activity"] > 6.0:
        return "Earthquake Warning"
    elif data["temperature"] > 45 and data["humidity"] < 40:
        return "Heatwave Alert"
    return "Normal Conditions"

# Simulated chatbot for public interaction
def chatbot():
    print("\nChatbot: Hello! How can I assist you during the disaster?")
    query = input("You: ").lower()
    if "safe" in query:
        print("Chatbot: Please move to a designated shelter and follow local emergency instructions.")
    elif "help" in query:
        print("Chatbot: Rescue teams have been notified. Stay calm and provide your location.")
    else:
        print("Chatbot: Stay safe. Monitor alerts and follow guidance from authorities.")

# Privacy-safe Logging
def log_event(event):
    masked_event = "[REDACTED]" if "location" in event.lower() else event
    logging.info(masked_event)

# Main simulation
def run_simulation():
    print("Starting Emergency Route Planner Simulation...\n")
    for _ in range(5):
        data = get_iot_data()
        prediction = predict_disaster(data)
        print(f"Sensor Data: {data}")
        print(f"Prediction: {prediction}\n")
        log_event(f"Sensor reading: {data} => Prediction: {prediction}")
        time.sleep(2)

    chatbot()
    print("\nSimulation Complete.")

# Corrected __name__ guard
if __name__ == "__main__":
    run_simulation()
