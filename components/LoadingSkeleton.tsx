import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import * as React from "react";
import {
    Animated,
    Easing,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";

type LoadingSkeletonProps = {
  count?: number;
  density?: "compact" | "expanded";
  style?: StyleProp<ViewStyle>;
  variant?: "cards" | "inline";
};

const cardLayouts = {
  compact: ["66%", "48%", "38%"],
  expanded: ["72%", "56%", "44%", "88%"],
} as const;

export default function LoadingSkeleton({
  count = 4,
  density = "compact",
  style,
  variant = "cards",
}: LoadingSkeletonProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const shimmerValue = React.useRef(new Animated.Value(0)).current;
  const animationRef = React.useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    animationRef.current = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    animationRef.current.start();

    return () => {
      animationRef.current?.stop();
    };
  }, [shimmerValue]);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180],
  });

  const skeletonBase = colorScheme === "dark" ? colors.card : "#eef2f7";
  const lineColor =
    colorScheme === "dark"
      ? "rgba(255,255,255,0.12)"
      : "rgba(31,41,55,0.08)";
  const shimmerColor =
    colorScheme === "dark"
      ? "rgba(255,255,255,0.08)"
      : "rgba(255,255,255,0.48)";

  if (variant === "inline") {
    return (
      <View
        style={[styles.inlineTrack, { backgroundColor: skeletonBase }, style]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerBand,
            {
              backgroundColor: shimmerColor,
              transform: [{ translateX }, { skewX: "-18deg" }],
            },
          ]}
        />
      </View>
    );
  }

  const lineWidths = cardLayouts[density];

  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`skeleton-card-${index}`}
          style={[
            styles.card,
            {
              backgroundColor: skeletonBase,
              borderColor: colors.border,
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmerBand,
              {
                backgroundColor: shimmerColor,
                transform: [{ translateX }, { skewX: "-18deg" }],
              },
            ]}
          />
          {lineWidths.map((width, lineIndex) => (
            <View
              key={`skeleton-line-${index}-${lineIndex}`}
              style={[
                styles.line,
                {
                  backgroundColor: lineColor,
                  width,
                  marginTop: lineIndex === 0 ? 0 : 8,
                  height:
                    lineIndex === lineWidths.length - 1 && density === "expanded"
                      ? 12
                      : 11,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    padding: 14,
  },
  line: {
    borderRadius: 999,
  },
  shimmerBand: {
    bottom: 0,
    left: "-40%",
    position: "absolute",
    top: 0,
    width: "40%",
  },
  inlineTrack: {
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
  },
});
