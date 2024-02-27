import sketch from "sketch";

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const alphaToHex = (alpha) => {
  const hexAlpha = Math.round(alpha * 255)
    .toString(16)
    .toUpperCase();
  return hexAlpha.padStart(2, "0");
};

const capitalizeState = (state) => {
  if (state) {
    const parts = state.split("-");
    if (parts.length > 1) {
      parts[1] = capitalize(parts[1]);
    }
    return parts.join("--");
  }
  return "";
};
const expandHexColor = (hexColor) => {
  if (hexColor.length === 4 && hexColor[0] === "#") {
    const isShortHex = hexColor === "#fff" || hexColor === "#000";
    if (isShortHex) {
      return (
        hexColor[0] +
        hexColor[1].repeat(2) +
        hexColor[2].repeat(2) +
        hexColor[3].repeat(2)
      );
    }
  }
  return hexColor;
};
const prefixOrder = {
  brand: 1,
  neutral: 2,
  critical: 3,
  informational: 4,
  successful: 5,
  warning: 6,
};

const createSwatch = (document, name, hexColor, alpha) => {  

  const expandedHex = expandHexColor(hexColor);
  const hexWithAlpha = expandedHex + alphaToHex(alpha);
  const Swatch = sketch.Swatch;

  let swatch = document.swatches.find((s) => s.name === name);
  if (!swatch) {
    swatch = Swatch.from({ name, color: hexWithAlpha });
    document.swatches.push(swatch);
    sketch.UI.message("Created Color Swatches.");
  } else {
    swatch.sketchObject.updateWithColor(
      MSColor.colorWithHex_alpha(hexColor, alpha)
    );

    let swatchContainer = document.sketchObject.documentData().sharedSwatches();
    swatchContainer.updateReferencesToSwatch(swatch.sketchObject);
    sketch.UI.message("Updated colors:", swatchContainer.length);
  }
};

/**
 *
 * @param {*} theme
 * @param {*} colorName
 * @returns restructured color name
 *
 * names of the colors need to be structured exactly like this for the swatches to be grouped correctly
 */
const generateColorName = (theme, colorName) => {
  let prefix, color, state;
  [prefix, color, state] = colorName.split("/");

  const capitalizedTheme = capitalize(theme);
  const capitalizedColor = capitalize(color);
  const capitalizedState = capitalizeState(state);

  function getFormattedCount(prefixOrder, prefix) {
    let count;
    if (prefixOrder.hasOwnProperty(prefix)) {
      count = prefixOrder[prefix];
    } else {
      count = Object.keys(prefixOrder).length + 1;
    }
    const formattedC = count < 10 ? count.toString().padStart(2, "0") : count.toString();
    return formattedC;
  }
  const formattedCount = getFormattedCount(prefixOrder, prefix);

  const componentName = `${formattedCount}--${capitalize(prefix)}`;

  if (color.includes("On")) {
    const parts = colorName.split("/").slice(0);
    const on = parts[1];
    color = parts[2];
    if (parts.length > 2) {
      state = capitalizeState(parts[3]);
    }
    if (parts[2].includes("01-Enabled")) {
      state = capitalizeState(parts[2]);
    }
    if (color === "bg-weak") {
      return `${capitalizedTheme}/${componentName}/${on}/Background/Weak--${state}`;
    } else if (color === "bg") {
      return `${capitalizedTheme}/${componentName}/${on}/Background/${state}`;
    } else if (color === "contrast") {
      return `${capitalizedTheme}/${componentName}/${on}/Contrast/${state}`;
    }
    return `${capitalizedTheme}/${componentName}/${on}/${state}`;
  }
  if (color.includes("bg")) {
    if (color === "bg-lvl-1") {
      return `${capitalizedTheme}/${componentName}/Background/Level-1--${capitalizedState}`;
    } else if (color === "bg-lvl-2") {
      return `${capitalizedTheme}/${componentName}/Background/Level-2--${capitalizedState}`;
    } else if (color === "bg-lvl-3") {
      return `${capitalizedTheme}/${componentName}/Background/Level-3--${capitalizedState}`;
    } else if (color.includes("bg-transparent")) {
      if (color === "bg-transparent-full") {
        return `${capitalizedTheme}/${componentName}/Background-Transparent/Full--${capitalizedState}`;
      } else {
        return `${capitalizedTheme}/${componentName}/Background-Transparent/Semi--${capitalizedState}`;
      }
    }
  }
  if (color.includes("contrast")) {
    if (color === "contrast-high") {
      return `${capitalizedTheme}/${componentName}/Contrast-High/${capitalizedState}`;
    }
    if (color === "contrast-low") {
      return `${capitalizedTheme}/${componentName}/Contrast-Low/${capitalizedState}`;
    }
  }

  return `${capitalizedTheme}/${componentName}/${capitalizedColor}/${capitalizedState}`;
};

const createArtboard = (
  parent,
  name,
  xOffset,
  yOffset,
  artboardWidth,
  artboardHeight
) => {
  return new sketch.Artboard({
    parent,
    name,
    frame: new sketch.Rectangle(
      xOffset,
      yOffset,
      Math.max(artboardWidth, 1050),
      Math.max(artboardHeight, 1300)
    ),
  });
};

const importThemes = async () => {
  try {
    const openPanel = NSOpenPanel.openPanel();
    openPanel.setTitle("Choose a JSON file");
    openPanel.setAllowedFileTypes(["json"]);

    const openPanelButtonPressed = openPanel.runModal();

    if (openPanelButtonPressed !== NSModalResponseOK) {
      sketch.UI.message("Import canceled.");
      return;
    }

    const jsonFilePath = openPanel.URL().path();
    const jsonContent = NSString.stringWithContentsOfFile_encoding_error(
      jsonFilePath,
      NSUTF8StringEncoding,
      null
    );

    const jsonData = JSON.parse(jsonContent);
    const document = sketch.getSelectedDocument();

    const response = await sketch.UI.getInputFromUser(
      "Select themes to import (Light/Dark/Both):",
      {
        initialValue: "Both",
      },
      async (err, value) => {
        if (err) {
          sketch.UI.message("Import canceled.");
          return;
        }
        const selectedOption = value.trim().toLowerCase();

        // process themes based on user selection
        const processTheme = async (theme) => {
          for (const colorName of Object.keys(jsonData[theme])) {
            const colorString = jsonData[theme][colorName];
            const [transparencyString, hexValue] = colorString.split(", ");

            const transparencyMatch = transparencyString.match(/(\d+%)/);
            const transparencyPercentage = transparencyMatch
              ? parseFloat(transparencyMatch[1])
              : 0;

            const alpha = 1 - transparencyPercentage / 100;

            const newNames = generateColorName(theme, colorName);

            createSwatch(document, newNames, hexValue, alpha);
          }
        };
        if (selectedOption === "light" || selectedOption === "both") {
          await processTheme("light");
        }
        if (selectedOption === "dark" || selectedOption === "both") {
          await processTheme("dark");
        }
        sketch.UI.message("JSON file imported successfully.");
      }
    );
  } catch (error) {
    console.error("Error importing themes:", error);
    sketch.UI.message("Error importing themes.");
  }
};

export default importThemes;


