import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { DeskProvider } from "./src/desk";
import { loadProfile, type DeskProfile } from "./src/floor";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AssistantScreen } from "./src/note-ai";
import { ComposeScreen } from "./src/screens/ComposeScreen";
import { DraftsScreen } from "./src/screens/DraftsScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { LandingScreen } from "./src/screens/LandingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OverviewScreen } from "./src/screens/OverviewScreen";
import { RankingScreen } from "./src/screens/RankingScreen";
import { SavedScreen } from "./src/screens/SavedScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { SignupScreen } from "./src/screens/SignupScreen";
import { ThreadScreen } from "./src/screens/ThreadScreen";
import { DeskScreen } from "./src/screens/DeskScreen";
import { WalletScreen } from "./src/screens/WalletScreen";
import { YouScreen } from "./src/screens/YouScreen";
import { supabase, supabaseConfigError } from "./src/supabase";
import { colors } from "./src/theme";
import type { AppStackParamList, GuestStackParamList, TabParamList } from "./src/types";

const GuestStack = createNativeStackNavigator<GuestStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_MARKS = {
  Feed: require("./assets/tabs/tape.jpg"),
  Search: require("./assets/tabs/search.jpg"),
  Write: require("./assets/tabs/write.jpg"),
  Ranking: require("./assets/tabs/rank.jpg"),
  You: require("./assets/tabs/you.jpg"),
} as const;

function FloorTabIcon({ name }: { name: keyof typeof TAB_MARKS }) {
  const action = name === "Write";

  return (
    <View style={[styles.tabButton, action && styles.tabButtonAction]}>
      <Image
        source={TAB_MARKS[name]}
        accessibilityIgnoresInvertColors
        style={[styles.tabMark, action && styles.tabMarkAction]}
      />
    </View>
  );
}

function WriteTab() {
  return null;
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.fg,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: "Tape",
          tabBarIcon: () => <FloorTabIcon name="Feed" />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: "Search",
          tabBarHideOnKeyboard: true,
          tabBarIcon: () => <FloorTabIcon name="Search" />,
        }}
      />
      <Tab.Screen
        name="Write"
        component={WriteTab}
        options={{
          title: "Write",
          tabBarIcon: () => <FloorTabIcon name="Write" />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent<NativeStackNavigationProp<AppStackParamList>>()?.navigate("Compose");
          },
        })}
      />
      <Tab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{
          title: "Rank",
          tabBarIcon: () => <FloorTabIcon name="Ranking" />,
        }}
      />
      <Tab.Screen
        name="You"
        component={YouScreen}
        options={{
          title: "You",
          tabBarIcon: () => <FloorTabIcon name="You" />,
        }}
      />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.fg,
    border: colors.border,
    primary: colors.fg,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.fg,
  headerTitleStyle: { fontWeight: "600" as const, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DeskProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (supabaseConfigError) {
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId) {
      return;
    }

    loadProfile(userId)
      .then(setProfile)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load this user.");
      });
  }, [session]);

  if (!ready || (session && !profile && !error)) {
    return (
      <SafeAreaProvider>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.fg} />
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <GuestStack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.fg,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <GuestStack.Screen name="Landing" options={{ headerShown: false }}>
            {({ navigation }) => (
              <LandingScreen
                onSignUp={() => navigation.navigate("Signup")}
                onHowItWorks={() => navigation.navigate("Overview")}
              />
            )}
          </GuestStack.Screen>
          <GuestStack.Screen name="Overview" options={{ title: "Laniakea" }}>
            {({ navigation }) => (
              <OverviewScreen
                onSignIn={() => navigation.navigate("Login")}
                onSignUp={() => navigation.navigate("Signup")}
              />
            )}
          </GuestStack.Screen>
          <GuestStack.Screen name="Login" options={{ title: "Sign in" }}>
            {({ navigation }) => <LoginScreen onSignUp={() => navigation.navigate("Signup")} />}
          </GuestStack.Screen>
          <GuestStack.Screen name="Signup" component={SignupScreen} options={{ title: "Sign up" }} />
        </GuestStack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaProvider>
        <View style={styles.centered}>
          <Text style={styles.error}>{error ?? "Could not load this user."}</Text>
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
    <DeskProvider profile={profile}>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <AppStack.Navigator initialRouteName="Main" screenOptions={screenOptions}>
          <AppStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <AppStack.Screen
            name="Compose"
            component={ComposeScreen}
            options={{ title: "New note", fullScreenGestureEnabled: false }}
          />
          <AppStack.Screen name="Landing" options={{ headerShown: false }}>
            {() => <LandingScreen />}
          </AppStack.Screen>
          <AppStack.Screen name="Overview" options={{ title: "How it works" }}>
            {({ navigation }) => (
              <OverviewScreen onOpenTape={() => navigation.navigate("Main")} />
            )}
          </AppStack.Screen>
          <AppStack.Screen
            name="Thread"
            component={ThreadScreen}
            options={{ title: "Note", fullScreenGestureEnabled: false }}
          />
          <AppStack.Screen name="Desk" component={DeskScreen} options={{ title: "User" }} />
          <AppStack.Screen name="Inbox" component={InboxScreen} options={{ title: "Inbox" }} />
          <AppStack.Screen name="Drafts" component={DraftsScreen} options={{ title: "Drafts" }} />
          <AppStack.Screen name="Saved" component={SavedScreen} options={{ title: "Saved" }} />
          <AppStack.Screen name="Wallet" component={WalletScreen} options={{ title: "Wallet" }} />
          <AppStack.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
          <AppStack.Screen name="Assistant" component={AssistantScreen} options={{ title: "Assistant" }} />
        </AppStack.Navigator>
      </NavigationContainer>
    </DeskProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonAction: {
    width: 32,
    height: 32,
  },
  tabMark: {
    width: 22,
    height: 22,
  },
  tabMarkAction: {
    width: 26,
    height: 26,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  error: {
    color: colors.loss,
    textAlign: "center",
  },
});
