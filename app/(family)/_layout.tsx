import { Tabs } from "expo-router";
import { Home, Users, Calendar, AlertOctagon } from "lucide-react-native";

export default function FamilyTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#006FFD",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: { borderTopColor: "#F3F4F6", paddingBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="parents"
        options={{
          title: "Parents",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ color, size }) => <AlertOctagon color={color} size={size} />,
          tabBarActiveTintColor: "#EF4444",
          tabBarInactiveTintColor: "#FCA5A5",
        }}
      />
    </Tabs>
  );
}
