import React from "react";
import { Form, InputNumber, Row, Col } from "antd";
import { isBefore, getDay, endOfDay, startOfDay } from "date-fns";
import { Week } from "../../apiMiddleware/flatServer/constants";
import { PeriodicEndType } from "../../constants/Periodic";
import { getRoomTypeName } from "../../utils/getTypeName";
import { DatePicker } from "../../components/antd-date-fns";
import { CreatePeriodicFormValues } from "./typings";
import { formatISODayWeekiii, getFinalDate, syncPeriodicEndAmount } from "./utils";
import { PeriodicEndTypeSelector } from "./PeriodicEndTypeSelector";
import { WeekRateSelector, getWeekNames } from "./WeekRateSelector";
import { FormInstance, RuleObject } from "antd/lib/form";

export function renderPeriodicForm(
    form: FormInstance<CreatePeriodicFormValues>,
): React.ReactElement | null {
    const isPeriodic: CreatePeriodicFormValues["isPeriodic"] = form.getFieldValue("isPeriodic");
    if (!isPeriodic) {
        return null;
    }

    return (
        <>
            <Form.Item
                shouldUpdate={(prev: CreatePeriodicFormValues, curr: CreatePeriodicFormValues) =>
                    prev.periodic !== curr.periodic || prev.type !== curr.type
                }
            >
                {renderPeriodicRoomTips}
            </Form.Item>
            <Form.Item
                label="重复频率"
                name={["periodic", "weeks"]}
                getValueFromEvent={onWeekSelected}
            >
                <WeekRateSelector onChange={onWeekRateChanged} />
            </Form.Item>
            <Form.Item label="结束重复">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name={["periodic", "endType"]}>
                            <PeriodicEndTypeSelector />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            noStyle
                            shouldUpdate={(
                                prev: CreatePeriodicFormValues,
                                curr: CreatePeriodicFormValues,
                            ) => prev.periodic.endType !== curr.periodic.endType}
                        >
                            {renderPeriodicEndAmount}
                        </Form.Item>
                    </Col>
                </Row>
            </Form.Item>
        </>
    );

    function renderPeriodicRoomTips(): React.ReactElement {
        const periodic: CreatePeriodicFormValues["periodic"] = form.getFieldValue("periodic");
        const roomType: CreatePeriodicFormValues["type"] = form.getFieldValue("type");
        return (
            <div className="create-periodic-room-tips">
                {periodic.weeks.length > 0 ? (
                    <div className="create-periodic-room-tips-title">
                        每{getWeekNames(periodic.weeks)}
                    </div>
                ) : (
                    <div>暂未选择频率</div>
                )}
                <div className="create-periodic-room-tips-type">
                    房间类型：{getRoomTypeName(roomType)}
                </div>
                <div className="create-periodic-room-tips-inner">
                    结束于 {formatISODayWeekiii(periodic.endTime)}
                    ，共 {periodic.rate} 个房间
                </div>
            </div>
        );
    }

    function renderPeriodicEndAmount(): React.ReactElement {
        return form.getFieldValue(["periodic", "endType"]) === PeriodicEndType.Rate ? (
            <Form.Item
                name={["periodic", "rate"]}
                rules={[
                    {
                        type: "integer",
                        min: 1,
                        message: "不能少于 1 个房间",
                    },
                    {
                        type: "integer",
                        max: 50,
                        message: "最多允许预定 50 个房间",
                    },
                ]}
            >
                <InputNumber min={1} max={50} onChange={onPeriodicRateChanged} />
            </Form.Item>
        ) : (
            <Form.Item
                name={["periodic", "endTime"]}
                getValueFromEvent={(date: Date | null) => date && endOfDay(date)}
                rules={[validatePeriodicEndTime]}
            >
                <DatePicker
                    format="YYYY-MM-DD"
                    allowClear={false}
                    disabledDate={disablePeriodicEndTime}
                    onChange={onPeriodicEndTimeChanged}
                />
            </Form.Item>
        );
    }

    function onWeekSelected(w: Week[]): Week[] {
        const week = getDay(form.getFieldValue(["beginTime", "date"]));
        if (!w.includes(week)) {
            w.push(week);
        }
        return w.sort();
    }

    function onWeekRateChanged(weeks: Week[]): void {
        const {
            beginTime,
            endTime,
            periodic,
        }: Pick<
            CreatePeriodicFormValues,
            "beginTime" | "endTime" | "periodic"
        > = form.getFieldsValue(["beginTime", "endTime", "periodic"]);
        syncPeriodicEndAmount(form, beginTime, endTime, { ...periodic, weeks });
    }

    function onPeriodicRateChanged(value: string | number | undefined): void {
        const rate = Number(value);
        if (!Number.isNaN(rate)) {
            const {
                beginTime,
                endTime,
                periodic,
            }: Pick<
                CreatePeriodicFormValues,
                "beginTime" | "endTime" | "periodic"
            > = form.getFieldsValue(["beginTime", "endTime", "periodic"]);
            syncPeriodicEndAmount(form, beginTime, endTime, { ...periodic, rate });
        }
    }

    function onPeriodicEndTimeChanged(date: Date | null): void {
        if (date) {
            const {
                beginTime,
                endTime,
                periodic,
            }: Pick<
                CreatePeriodicFormValues,
                "beginTime" | "endTime" | "periodic"
            > = form.getFieldsValue(["beginTime", "endTime", "periodic"]);
            syncPeriodicEndAmount(form, beginTime, endTime, { ...periodic, endTime: date });
        }
    }

    function disablePeriodicEndTime(currentTime: Date | null): boolean {
        if (currentTime) {
            const beginTimeDate: CreatePeriodicFormValues["beginTime"]["date"] = form.getFieldValue(
                ["beginTime", "date"],
            );
            return isBefore(currentTime, startOfDay(beginTimeDate));
        }
        return false;
    }

    function validatePeriodicEndTime(): RuleObject {
        return {
            validator: async (_, value: Date) => {
                const {
                    periodic,
                    beginTime,
                }: Pick<CreatePeriodicFormValues, "periodic" | "beginTime"> = form.getFieldsValue([
                    "periodic",
                    "beginTime",
                ]);

                if (periodic.rate > 50) {
                    throw new Error("最多允许预定 50 个房间");
                }

                if (isBefore(value, getFinalDate(beginTime))) {
                    throw new Error(`结束重复日期不能小于开始时间日期`);
                }
            },
        };
    }
}