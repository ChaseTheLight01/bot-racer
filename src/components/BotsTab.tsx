import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import { animated, useSpring } from "react-spring";
import { selectStyle } from "../customStyle";
import { getAllYearsUntilNow } from "../dateUtils";
import styles from "../style/BotsTab.module.scss";
import { BotStats, Option, RaceData, TabProps } from "../types";
import RaceGraph from "./subcomponents/RaceGraph";
import YearSelection from "./subcomponents/YearSelection";

const BotsTab: React.FC<TabProps> = ({ handleYearChange, currentYear }) => {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [entries, setEntries] = useState<Option[]>([]);
  const [botStats, setBotStats] = useState<BotStats[]>([]);
  const [racesData, setRacesData] = useState<Map<string, RaceData[]>>(new Map<string, RaceData[]>());
  const [selectedRaceYear, setSelectedRaceYear] = useState<RaceData[]>([]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get("search");

  const navigate = useNavigate();

  useEffect(() => {
    if (searchQuery) {
      const selectedBot = botStats.find((stats) => stats.bot === searchQuery);
      if (selectedBot) {
        setSelectedOption({ value: selectedBot.bot, label: selectedBot.bot });
      }
    }
  }, [searchQuery, botStats]);

  const incrementBotStat = (
    botStatsMap: Map<string, BotStats>,
    bot: string,
    statKey: keyof BotStats
  ) => {
    const botStat = botStatsMap.get(bot);
    if (botStat) {
      if (!(statKey in botStat)) {
        (botStat[statKey] as number) = 0;
      }
      (botStat[statKey] as number) += 1;
    } else {
      botStatsMap.set(bot, {
        bot,
        winner: statKey === "winner" ? 1 : 0,
        A: statKey === "A" ? 1 : 0,
        B: statKey === "B" ? 1 : 0,
        C: statKey === "C" ? 1 : 0,
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const raceMapByYear = new Map<string, RaceData[]>();
      Promise.all(getAllYearsUntilNow().map(async year => {
        let raceData: RaceData[];
        try {
          const response = await fetch(`/data/races/${year}.json`);
          raceData = await response.json();
        } catch (error) {
          return console.error(`Error fetching race data for year ${year}: ${error}`);
        }
        raceMapByYear.set("all", [...raceData, ...(raceMapByYear.get("all") || [])]);
        raceMapByYear.set(year, raceData);
      })).then(() => setRacesData(() => raceMapByYear));
    };
    fetchData();
  }, []);

  useEffect(() => {
    const data = racesData.get(currentYear) || [];
    const botStatsMap = new Map<string, BotStats>();
    data.forEach((race) => {
      const { winner, A, B, C } = race.data;
      winner.forEach((bot) => incrementBotStat(botStatsMap, bot, "winner"));
      A.forEach((bot) => incrementBotStat(botStatsMap, bot, "A"));
      B.forEach((bot) => incrementBotStat(botStatsMap, bot, "B"));
      C.forEach((bot) => incrementBotStat(botStatsMap, bot, "C"));
    });
    const botStatsArr = Array.from(botStatsMap.values());
    setBotStats(botStatsArr);
    const options = [...botStatsArr]
      .sort((s1, s2) => s1.bot.localeCompare(s2.bot))
      .map((stats) => ({
        value: stats.bot,
        label: stats.bot,
      }));

    setEntries(options);
    setSelectedRaceYear(data);
  }, [racesData, currentYear]);

  const handleSelectChange = (option: Option | null) => {
    if (selectedOption && option && selectedOption.value === option.value) {
      return;
    }
    setSelectedOption(option);

    const newSearchQuery = option ? option.value : "";
    const newSearchParams = new URLSearchParams();
    newSearchParams.set("search", newSearchQuery);
    navigate(`?${newSearchParams.toString()}`);
  };

  const AnimatedNumber: React.FC<{ value: number; }> = ({ value }) => {
    const numberProps = useSpring({ value, from: { value: 0 } });
    return (
      <animated.span>
        {numberProps.value.to((val) => val.toFixed(0))}
      </animated.span>
    );
  };

  const renderDashboard = (selectedBot: BotStats | null | undefined) => {
    if (!selectedBot) {
      return null;
    }

    const { bot, winner, A, B, C } = selectedBot;

    return (
      <div className={styles.dashboard}>
        <h3>{bot}</h3>
        <div className={styles.statBubbles}>
          <div className={styles.statBubble}>
            <p>Winner</p>
            <AnimatedNumber value={winner} />
          </div>
          <div className={styles.statBubble}>
            <p>A Rank</p>
            <AnimatedNumber value={A} />
          </div>
          <div className={styles.statBubble}>
            <p>B Rank</p>
            <AnimatedNumber value={B} />
          </div>
          <div className={styles.statBubble}>
            <p>C Rank</p>
            <AnimatedNumber value={C} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.botsTab}>
      <YearSelection onSelectYear={handleYearChange} selectedYear={currentYear} />
      <Select
        options={entries}
        value={selectedOption}
        onChange={handleSelectChange}
        placeholder="Select a bot"
        styles={selectStyle}
      />
      {renderDashboard(
        botStats.find((stats) => stats.bot === selectedOption?.value)
      )}
      {selectedOption && (
        <RaceGraph
          bot={selectedOption.value}
          raceData={selectedRaceYear}
        />
      )}
    </div>
  );
};

export default BotsTab;